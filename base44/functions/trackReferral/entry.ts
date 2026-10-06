import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Attributes a new sign-up to the referrer whose ScentProfile id was passed
// as the `ref` query param on /register. Called once right after verifyOtp.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { ref, referred_email } = await req.json();
    if (referred_email !== me.email) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!ref || typeof ref !== 'string') return Response.json({ error: 'Missing ref' }, { status: 400 });

    const entities = base44.asServiceRole.entities;
    const referrerProfiles = await entities.ScentProfile.filter({ id: ref }, undefined, 1);
    if (!referrerProfiles.length) return Response.json({ error: 'Referrer not found' }, { status: 404 });
    const referrer_email = referrerProfiles[0].user_email;
    if (!referrer_email || referrer_email === me.email) return Response.json({ error: 'Invalid referral' }, { status: 400 });

    // One referral per new user — no duplicates, no spam.
    const existing = await entities.Referral.filter({ referred_email: me.email }, undefined, 1);
    if (existing.length) return Response.json({ success: true, duplicate: true });

    await entities.Referral.create({ referrer_email, referred_email: me.email, status: 'pending' });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Referral failed' }, { status: 500 });
  }
}