import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    const profiles = await base44.asServiceRole.entities.ScentProfile.list();
    const cutoff = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago

    const stale = profiles.filter(p => {
      if (!p.is_online) return false;
      if (!p.last_active) return true;
      return new Date(p.last_active) < cutoff;
    });

    await Promise.all(
      stale.map(p =>
        base44.asServiceRole.entities.ScentProfile.update(p.id, { is_online: false })
      )
    );

    return Response.json({ marked_offline: stale.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});