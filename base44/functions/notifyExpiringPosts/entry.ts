import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const posts = await base44.asServiceRole.entities.StatusPost.list();
    const now = new Date();
    const soon = new Date(now.getTime() + 20 * 60 * 1000); // 20 min window
    const target = new Date(now.getTime() + 15 * 60 * 1000); // ~15 min from now

    const expiring = posts.filter(p => {
      if (!p.expires_at) return false;
      const exp = new Date(p.expires_at);
      return exp >= now && exp <= soon;
    });

    await Promise.all(expiring.map(p =>
      base44.asServiceRole.entities.Notification.create({
        user_email: p.user_email,
        type: "status_interaction",
        actor_email: p.user_email,
        actor_name: p.display_name,
        title: "Your vibe is expiring soon! ⏰",
        description: `"${p.content.slice(0, 60)}${p.content.length > 60 ? '…' : ''}" expires in ~15 minutes. Post again to keep the energy going!`,
        read: false,
      })
    ));

    return Response.json({ notified: expiring.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});