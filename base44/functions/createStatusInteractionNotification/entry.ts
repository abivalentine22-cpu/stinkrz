import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { post_id } = await req.json();
    if (typeof post_id !== 'string') return Response.json({ error: 'Missing post' }, { status: 400 });
    const entities = base44.asServiceRole.entities;
    const post = (await entities.StatusPost.filter({ id: post_id }, undefined, 1))[0];
    if (!post || Date.parse(post.expires_at) < Date.now()) return Response.json({ error: 'Post unavailable' }, { status: 404 });
    if (post.user_email === me.email) return Response.json({ success: true });
    const blocks = await entities.BlockedUser.filter({ $or: [
      { blocker_email: me.email, blocked_email: post.user_email }, { blocker_email: post.user_email, blocked_email: me.email },
    ] }, undefined, 1);
    if (blocks.length) return Response.json({ error: 'Interaction unavailable' }, { status: 403 });
    const whiffs = await entities.Favorite.filter({ from_email: me.email, to_email: post.user_email }, undefined, 1);
    if (!whiffs.length) return Response.json({ error: 'Interaction not found' }, { status: 403 });
    const ref = `post:${post_id}:${whiffs[0].id}`;
    const existing = await entities.Notification.filter({ user_email: post.user_email, message_id: ref }, undefined, 1);
    if (existing.length) return Response.json({ success: true });
    const profile = (await entities.ScentProfile.filter({ user_email: me.email }, undefined, 1))[0];
    const name = profile?.display_name || 'Someone';
    const notification = await entities.Notification.create({
      user_email: post.user_email, type: 'status_interaction', actor_email: me.email,
      actor_name: name, actor_avatar: profile?.avatar_url || null, message_id: ref,
      title: `${name} interacted with your post`, description: 'They want to whiff you!', read: false,
    });
    await base44.functions.invoke('sendPushNotification', { notification_id: notification.id }).catch(() => {});
    return Response.json({ success: true });
  } catch { return Response.json({ error: 'Notification failed' }, { status: 500 }); }
});
