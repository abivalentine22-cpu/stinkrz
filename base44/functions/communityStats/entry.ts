import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

Deno.serve(async (req: Request) => {
  try {
    const client = createClientFromRequest(req);
    const me = await client.auth.me();
    if (!me?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // Return only an aggregate, never member records or email addresses.
    let totalUsers = 0;
    for (let skip = 0; ; skip += 500) {
      const users = await client.asServiceRole.entities.User.filter({}, 'created_date', 500, skip);
      totalUsers += users.length;
      if (users.length < 500) break;
    }
    return Response.json({ totalUsers });
  } catch {
    return Response.json({ error: 'Community count unavailable' }, { status: 503 });
  }
});
