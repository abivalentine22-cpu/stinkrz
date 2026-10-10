import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function allRecords(entity) {
  const records = [];
  for (let skip = 0; ; ) {
    const page = await entity.list('id', 100, skip);
    records.push(...page);
    if (page.length < 100) return records;
    skip += page.length;
  }
}

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

    const notifications = await allRecords(base44.asServiceRole.entities.Notification);
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const old = notifications.filter(n => new Date(n.created_date) < cutoff);

    for (let start = 0; start < old.length; start += 10) {
      await Promise.all(old.slice(start, start + 10).map(n => base44.asServiceRole.entities.Notification.delete(n.id)));
    }

    return Response.json({ deleted: old.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});