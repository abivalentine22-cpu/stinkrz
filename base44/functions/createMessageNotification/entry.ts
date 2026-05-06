import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { message_id, sender_email, sender_name, sender_avatar, receiver_email } = await req.json();

    if (!receiver_email || !sender_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create notification for receiver
    await base44.asServiceRole.entities.Notification.create({
      user_email: receiver_email,
      type: 'new_message',
      actor_email: sender_email,
      actor_name: sender_name || 'Someone',
      actor_avatar: sender_avatar || null,
      message_id,
      title: `New message from ${sender_name || 'a user'}`,
      description: 'Tap to view',
      read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});