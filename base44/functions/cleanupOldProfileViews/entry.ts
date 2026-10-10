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

    // Keep the last 14 days of profile-view history; anything older is bloat.
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const result = await base44.asServiceRole.entities.ProfileView.deleteMany({
      created_date: { $lt: cutoff }
    });

    const deleted =
      (result && (result.deleted_count ?? result.deletedCount)) ??
      (typeof result === 'number' ? result : 0);

    return Response.json({ deleted, cutoff });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});