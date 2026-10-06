import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { from_email, to_email } = await req.json();
    if (from_email !== me.email || !to_email || to_email === me.email) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const entities = base44.asServiceRole.entities;
    const blocks = await entities.BlockedUser.filter({ $or: [
      { blocker_email: me.email, blocked_email: to_email }, { blocker_email: to_email, blocked_email: me.email },
    ] }, undefined, 1);
    if (blocks.length) return Response.json({ error: 'Interaction unavailable' }, { status: 403 });
    const whiffs = await entities.Favorite.filter({ from_email: me.email, to_email }, undefined, 1);
    if (!whiffs.length) return Response.json({ error: 'Whiff not found' }, { status: 403 });
    const ref = `whiff:${whiffs[0].id}`;
    const existing = await entities.Notification.filter({ user_email: to_email, message_id: ref }, undefined, 1);
    if (existing.length) return Response.json({ success: true });
    const [fromProfiles, toProfiles, reciprocal] = await Promise.all([
      entities.ScentProfile.filter({ user_email: me.email }, undefined, 1),
      entities.ScentProfile.filter({ user_email: to_email }, undefined, 1),
      entities.Favorite.filter({ from_email: to_email, to_email: me.email }, undefined, 1),
    ]);
    if (!toProfiles.length) return Response.json({ error: 'Recipient unavailable' }, { status: 403 });
    const name = fromProfiles[0]?.display_name || 'Someone';
    const mutual = reciprocal.length > 0;
    const notification = await entities.Notification.create({
      user_email: to_email, type: 'status_interaction', actor_email: me.email,
      actor_name: name, actor_avatar: fromProfiles[0]?.avatar_url || null, message_id: ref,
      title: mutual ? "👃 You caught each other's scent!" : `${name} sent you a Whiff 👃`,
      description: mutual ? `${name} whiffed you back. Say hi 👋` : "Whiff back to show you're interested.",
      read: false,
    });
    if (mutual) await entities.Notification.create({
      user_email: me.email, type: 'status_interaction', actor_email: to_email,
      actor_name: toProfiles[0]?.display_name || 'Someone', actor_avatar: toProfiles[0]?.avatar_url || null,
      message_id: ref, title: "👃 You caught each other's scent!",
      description: 'You both whiffed each other. Message them?', read: false,
    });
    await base44.functions.invoke('sendPushNotification', { notification_id: notification.id }).catch(() => {});
    return Response.json({ success: true, mutual });
  } catch { return Response.json({ error: 'Notification failed' }, { status: 500 }); }
}
