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
    const authenticated = await base44.auth.isAuthenticated();
    if (!authenticated) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_email, title, body, data } = await req.json();
    if (!user_email || !title) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
      return Response.json({ error: 'Token mint failed: ' + e.message }, { status: 500 });
    }

    // Build string-only data payload (FCM requirement). Include title/body so the
    // service worker can render the notification from a data-only message.
    const dataPayload = { title, body: body || '' };
    if (data && typeof data === 'object') {
      for (const k of Object.keys(data)) dataPayload[k] = String(data[k]);
    }

    const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
    const invalidIds = [];
    let sent = 0;

    for (const t of tokens) {
      const message = { token: t.token, data: dataPayload };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        sent++;
      } else {
        const errText = await res.text();
        if (/UNREGISTERED|NOT_FOUND|invalid|404/i.test(errText)) {
          invalidIds.push(t.id);
        }
      }
    }

    // Clean up stale tokens
    for (const id of invalidIds) {
      try {
        await base44.asServiceRole.entities.PushToken.delete(id);
      } catch (_) {}
    }

    return Response.json({ success: true, sent, total: tokens.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});