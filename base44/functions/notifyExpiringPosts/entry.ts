import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function allRecords(entity) {
  const records = [];
  for (let skip = 0; ; ) {
    const page = await entity.list('id', 100, skip);
    records.push(...page);
    if (page.length < 100) return records;
    skip += page.length;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Scheduled runs were verified to authenticate as the owner/admin.
    let caller;
    try {
      caller = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!caller) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (caller.id !== '69faa8a3ff7324c96aef6557' || caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const posts = await allRecords(base44.asServiceRole.entities.StatusPost);
    const now = new Date();
    const soon = new Date(now.getTime() + 20 * 60 * 1000); // 20 min window

    const expiring = posts.filter(p => {
      if (!p.expires_at) return false;
      const exp = new Date(p.expires_at);
      return exp >= now && exp <= soon;
    });

    let notified = 0;
    for (const p of expiring) {
      // A timed lease can be reclaimed after a crashed run; sent is set only after delivery.
      const claimId = crypto.randomUUID();
      const claim = await base44.asServiceRole.entities.StatusPost.updateMany(
        { id: p.id, expires_at: p.expires_at, expiry_reminder_sent: { $ne: true },
          $or: [{ expiry_reminder_claim_until: { $exists: false } }, { expiry_reminder_claim_until: { $lte: Date.now() } }] },
        { $set: { expiry_reminder_claim_id: claimId, expiry_reminder_claim_until: Date.now() + 10 * 60000 } },
      );
      if (!claim?.success || claim.updated !== 1) continue;
      try {
        const minutes = Math.max(1, Math.ceil((new Date(p.expires_at).getTime() - now.getTime()) / 60000));
        const content = p.content || '';
        // A previous run may have created the notification before crashing.
        const existing = await base44.asServiceRole.entities.Notification.filter({
          user_email: p.user_email, message_id: p.id, type: 'status_interaction',
          title: 'Your vibe is expiring soon! ⏰',
        }, undefined, 1);
        if (!existing.length) await base44.asServiceRole.entities.Notification.create({
          user_email: p.user_email,
          type: "status_interaction",
          actor_email: p.user_email,
          actor_name: p.display_name,
          message_id: p.id,
          title: "Your vibe is expiring soon! ⏰",
          description: `"${content.slice(0, 60)}${content.length > 60 ? '…' : ''}" expires in ~${minutes} minutes. Post again to keep the energy going!`,
          read: false,
        });
        await base44.asServiceRole.entities.StatusPost.updateMany(
          { id: p.id, expiry_reminder_claim_id: claimId },
          { $set: { expiry_reminder_sent: true, expiry_reminder_claim_until: 0, expiry_reminder_claim_id: '' } },
        );
        if (!existing.length) notified++;
      } catch (error) {
        // Release a failed create so a later run can retry.
        await base44.asServiceRole.entities.StatusPost.updateMany(
          { id: p.id, expiry_reminder_claim_id: claimId },
          { $set: { expiry_reminder_claim_until: 0, expiry_reminder_claim_id: '' } },
        );
        throw error;
      }
    }
    return Response.json({ notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});