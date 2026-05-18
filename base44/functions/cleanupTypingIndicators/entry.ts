import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
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