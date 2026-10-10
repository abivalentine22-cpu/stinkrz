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
    const all = await base44.asServiceRole.entities.TypingIndicator.list();
    const now = new Date();
    const stale = all.filter(t => {
      if (!t.expires_at) return true; // no expiry = delete
      return new Date(t.expires_at) < now;
    });
    await Promise.all(stale.map(t => base44.asServiceRole.entities.TypingIndicator.delete(t.id)));
    return Response.json({ deleted: stale.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});