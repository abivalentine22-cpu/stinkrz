import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { ref, action = 'attribute' } = await req.json();
    const entities = base44.asServiceRole.entities;

    if (action === 'stats') {
      let completed = 0;
      const counted = new Set<string>();
      for (let skip = 0; ; skip += 100) {
        const refs = await entities.Referral.filter({ referrer_email: me.email }, 'created_date', 100, skip);
        for (const referral of refs) {
          if (!referral.referred_email || counted.has(referral.referred_email)) continue;
          counted.add(referral.referred_email);
          if (referral.status === 'completed') { completed++; continue; }
          const profiles = await entities.ScentProfile.filter({ user_email: referral.referred_email }, undefined, 1);
          if (profiles[0]?.onboarding_complete) {
            await entities.Referral.update(referral.id, { status: 'completed' });
            completed++;
          }
        }
        if (refs.length < 100) break;
      }
      return Response.json({ completed });
    }

    const profiles = await entities.ScentProfile.filter({ user_email: me.email }, undefined, 1);
    const existing = await entities.Referral.filter({ referred_email: me.email }, undefined, 1);
    if (action === 'complete') {
      if (!profiles[0]?.onboarding_complete) return Response.json({ error: 'Finish onboarding first' }, { status: 400 });
      if (existing[0] && existing[0].status !== 'completed') {
        await entities.Referral.update(existing[0].id, { status: 'completed' });
      }
      return Response.json({ success: true });
    }
    if (action !== 'attribute') return Response.json({ error: 'Invalid action' }, { status: 400 });
    if (existing.length) return Response.json({ success: true, duplicate: true });
    if (profiles[0]?.onboarding_complete) return Response.json({ error: 'Referrals are for new members' }, { status: 400 });
    if (!ref || typeof ref !== 'string') return Response.json({ error: 'Missing ref' }, { status: 400 });
    const referrerProfiles = await entities.ScentProfile.filter({ id: ref }, undefined, 1);
    const referrer_email = referrerProfiles[0]?.user_email;
    if (!referrer_email || referrer_email === me.email) return Response.json({ error: 'Invalid referral' }, { status: 400 });
    await entities.Referral.create({ referrer_email, referred_email: me.email, status: 'pending' });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Referral request failed' }, { status: 500 });
  }
});
