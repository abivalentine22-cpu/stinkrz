import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { message_id } = await req.json();
    if (!message_id || typeof message_id !== 'string') return Response.json({ error: 'Missing message' }, { status: 400 });
    const entities = base44.asServiceRole.entities;
    const message = (await entities.ChatMessage.filter({ id: message_id }, undefined, 1))[0];
    if (!message || message.sender_email !== me.email) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const blocks = await entities.BlockedUser.filter({ $or: [
      { blocker_email: me.email, blocked_email: message.receiver_email },
      { blocker_email: message.receiver_email, blocked_email: me.email },
    ] }, undefined, 1);
    if (blocks.length) return Response.json({ error: 'Interaction unavailable' }, { status: 403 });
    const existing = await entities.Notification.filter({ message_id, type: 'new_message', user_email: message.receiver_email }, undefined, 1);
    if (existing.length) {
      await base44.functions.invoke('sendPushNotification', { notification_id: existing[0].id }).catch(() => {});
      return Response.json({ success: true });
    }
    const profile = (await entities.ScentProfile.filter({ user_email: me.email }, undefined, 1))[0];
    const name = profile?.display_name || 'Someone';
    const notification = await entities.Notification.create({
      user_email: message.receiver_email, type: 'new_message', actor_email: me.email,
      actor_name: name, actor_avatar: profile?.avatar_url || null, message_id,
      title: `New message from ${name}`, description: 'Tap to view your messages', read: false,
    });
    await base44.functions.invoke('sendPushNotification', { notification_id: notification.id }).catch(() => {});
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Notification failed' }, { status: 500 });
  }
});
