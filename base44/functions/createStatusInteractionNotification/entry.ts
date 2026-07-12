import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { post_id, interactor_email, interactor_name, interactor_avatar, post_owner_email } = await req.json();

    if (!post_owner_email || !interactor_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Don't notify if user interacts with their own post
    if (post_owner_email === interactor_email) {
      return Response.json({ success: true });
    }

    // Create notification for post owner
    await base44.asServiceRole.entities.Notification.create({
      user_email: post_owner_email,
      type: 'status_interaction',
      actor_email: interactor_email,
      actor_name: interactor_name || 'Someone',
      actor_avatar: interactor_avatar || null,
      message_id: post_id,
      title: `${interactor_name || 'A user'} interacted with your post`,
      description: 'They want to whiff you!',
      read: false,
    });

    // Send a background push notification (best-effort, fire-and-forget)
    base44.functions.invoke('sendPushNotification', {
      user_email: post_owner_email,
      title: `${interactor_name || 'A user'} reacted to your post`,
      body: 'They want to whiff you!',
      data: { type: 'status_interaction', post_id, actor_email: interactor_email, url: '/feed' },
    }).catch(() => {});

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});