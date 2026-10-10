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
    const posts = await allRecords(base44.asServiceRole.entities.StatusPost);
    const now = new Date();
    const expired = posts.filter(p => p.expires_at && new Date(p.expires_at) < now);
    let deleted = 0;
    for (let start = 0; start < expired.length; start += 10) {
      const results = await Promise.all(expired.slice(start, start + 10).map(p =>
        base44.asServiceRole.entities.StatusPost.deleteMany({
          id: p.id, expires_at: p.expires_at === undefined ? { $exists: false } : p.expires_at,
        })
      ));
      for (const result of results) {
        if (!result?.success) throw new Error('Cleanup failed');
        deleted += result.deleted;
      }
    }
    return Response.json({ deleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});