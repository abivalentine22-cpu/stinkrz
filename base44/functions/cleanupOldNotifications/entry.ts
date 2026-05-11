import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const notifications = await base44.asServiceRole.entities.Notification.list();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const old = notifications.filter(n => new Date(n.created_date) < cutoff);

    await Promise.all(
      old.map(n => base44.asServiceRole.entities.Notification.delete(n.id))
    );

    return Response.json({ deleted: old.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});