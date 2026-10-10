import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// --- JWT / OAuth2 helpers (no external deps; Deno SubtleCrypto + fetch) ---

function base64urlEncode(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function strToBuffer(str) {
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i);
  return buf.buffer;
}

function pemToBinary(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return strToBuffer(atob(b64));
}

async function getAccessToken(clientEmail, privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const unsigned = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64urlEncode(signature)}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    signal: AbortSignal.timeout(10000),
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    throw new Error(`OAuth token exchange failed: ${txt}`);
  }
  const tokenJson = await tokenRes.json();
  return tokenJson.access_token;
}

// --- Handler ---

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let me;
    try { me = await base44.auth.me(); } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
    if (!me?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { notification_id } = await req.json();
    if (typeof notification_id !== 'string') return Response.json({ error: 'Missing notification' }, { status: 400 });
    const entities = base44.asServiceRole.entities;
    const notification = (await entities.Notification.filter({ id: notification_id }, undefined, 1))[0];
    if (!notification || notification.actor_email !== me.email) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const user_email = notification.user_email;
    const blocks = await entities.BlockedUser.filter({ $or: [
      { blocker_email: me.email, blocked_email: user_email }, { blocker_email: user_email, blocked_email: me.email },
    ] }, undefined, 1);
    if (blocks.length) return Response.json({ error: 'Interaction unavailable' }, { status: 403 });
    // Legacy attempts remain closed; new attempts have recoverable delivery state.
    if (notification.push_completed || (notification.push_attempted && !notification.push_state)) return Response.json({ success: true, sent: 0 });
    const title = notification.title;
    const body = notification.description || 'Tap to view';
    const data = {
      type: notification.type,
      message_id: notification.message_id || '',
      partner_email: notification.actor_email,
      url: notification.type === 'new_message'
        ? (notification.actor_email ? `/messages?with=${encodeURIComponent(notification.actor_email)}` : '/messages')
        : '/matches',
    };

    const saRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!saRaw) {
      return Response.json({ error: 'Firebase service account not configured' }, { status: 500 });
    }
    const sa = JSON.parse(saRaw);

    const tokens = await base44.asServiceRole.entities.PushToken.filter({ user_email }, undefined, 500);
    if (!tokens.length) {
      return Response.json({ success: true, sent: 0, reason: 'no_tokens' });
    }

    let accessToken;
    try {
      accessToken = await getAccessToken(sa.client_email, sa.private_key);
    } catch (e) {
      return Response.json({ error: 'Push provider unavailable; retry later' }, { status: 500 });
    }

    const claimId = crypto.randomUUID();
    const claim = await entities.Notification.updateMany({
      id: notification.id, push_completed: { $ne: true },
      $or: [{ push_claim_until: { $exists: false } }, { push_claim_until: { $lte: Date.now() } }],
    }, { $set: { push_claim_id: claimId, push_claim_until: Date.now() + 10 * 60000, push_state: 'sending' } });
    if (!claim?.success || claim.updated !== 1) return Response.json({ success: true, sent: 0, reason: 'already_claimed' });
    let sent = 0;
    try {
      const current = (await entities.Notification.filter({ id: notification.id }, undefined, 1))[0];
      const delivered = new Set<string>(current?.push_delivered_token_ids || []);
      const dataPayload: Record<string, string> = { title: String(title || 'Stinkrz'), body: String(body), tag: 'stinkrz-' + notification.id };
      for (const [key, value] of Object.entries(data)) dataPayload[key] = String(value);
      const endpoint = 'https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send';
      let failed = 0;
      const deadline = Date.now() + 60000;
      for (const t of tokens) {
        if (delivered.has(t.id)) continue;
        if (Date.now() >= deadline) { failed++; break; }
        try {
          const res = await fetch(endpoint, {
            method: 'POST', signal: AbortSignal.timeout(10000),
            headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { token: t.token, data: dataPayload } }),
          });
          if (res.ok) {
            delivered.add(t.id); sent++;
            await entities.Notification.updateMany({ id: notification.id, push_claim_id: claimId },
              { $set: { push_delivered_token_ids: [...delivered] } });
          } else {
            const providerError = await res.json().catch(() => ({}));
            const unregistered = providerError.error?.details?.some(d => d.errorCode === 'UNREGISTERED');
            if (unregistered) {
              await entities.PushToken.delete(t.id);
              delivered.add(t.id);
            } else failed++;
          }
        } catch { failed++; }
      }
      await entities.Notification.updateMany({ id: notification.id, push_claim_id: claimId }, { $set: {
        push_delivered_token_ids: [...delivered], push_completed: failed === 0,
        push_attempted: failed === 0, push_state: failed ? 'retryable' : 'complete',
        push_claim_id: '', push_claim_until: 0,
      } });
      return Response.json({ success: failed === 0, sent, total: tokens.length, retryable: failed > 0 }, { status: failed ? 503 : 200 });
    } catch {
      await entities.Notification.updateMany({ id: notification.id, push_claim_id: claimId },
        { $set: { push_state: 'retryable', push_claim_id: '', push_claim_until: 0 } });
      return Response.json({ error: 'Push delivery failed; retry later' }, { status: 503 });
    }
  } catch (error) {
    return Response.json({ error: 'Push delivery failed' }, { status: 500 });
  }
});