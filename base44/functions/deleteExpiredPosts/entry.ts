import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const posts = await base44.asServiceRole.entities.StatusPost.list();
    const now = new Date();
    const expired = posts.filter(p => p.expires_at && new Date(p.expires_at) < now);
    await Promise.all(expired.map(p => base44.asServiceRole.entities.StatusPost.delete(p.id)));
    return Response.json({ deleted: expired.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});