import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Creates a Whiff (interest-signal) notification for the recipient.
// RLS blocks client-side creation of notifications for OTHER users, so this
// service-role function is the single path for cross-user whiff notifications.
// On a mutual whiff, it notifies both parties with "You caught each other's scent".
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const authenticated = await base44.auth.isAuthenticated();
    if (!authenticated) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { from_email, to_email } = await req.json();
    if (!from_email || !to_email) return Response.json({ error: 'Missing required fields' }, { status: 400 });
    if (from_email === to_email) return Response.json({ success: true });

    // Ensure the caller is who they claim to be.
    const me = await base44.auth.me();
    if (me?.email !== from_email) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Look up both profiles for notification copy.
    const [fromProfiles, toProfiles] = await Promise.all([
      base44.asServiceRole.entities.ScentProfile.filter({ user_email: from_email }),
      base44.asServiceRole.entities.ScentProfile.filter({ user_email: to_email }),
    ]);
    const from_name = fromProfiles[0]?.display_name || 'Someone';
    const from_avatar = fromProfiles[0]?.avatar_url || null;
    const to_name = toProfiles[0]?.display_name || 'Someone';

    // Mutuality: did to_email already whiff from_email?
    const theirWhiffs = await base44.asServiceRole.entities.Favorite.filter({
      from_email: to_email,
      to_email: from_email,
    });
    const mutual = theirWhiffs.length > 0;

    if (mutual) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: to_email,
        type: 'status_interaction',
        actor_email: from_email,
        actor_name: from_name,
        actor_avatar: from_avatar,
        title: "👃 You caught each other's scent!",
        description: `${from_name} whiffed you back. Say hi 👋`,
        read: false,
      });
      await base44.asServiceRole.entities.Notification.create({
        user_email: from_email,
        type: 'status_interaction',
        actor_email: to_email,
        actor_name: to_name,
        actor_avatar: null,
        title: "👃 You caught each other's scent!",
        description: 'You both whiffed each other. Message them?',
        read: false,
      });
      base44.functions.invoke('sendPushNotification', {
        user_email: to_email,
        title: "👃 You caught each other's scent!",
        body: `${from_name} whiffed you back`,
        data: { type: 'whiff_mutual', actor_email: from_email, url: '/matches' },
      }).catch(() => {});
    } else {
      await base44.asServiceRole.entities.Notification.create({
        user_email: to_email,
        type: 'status_interaction',
        actor_email: from_email,
        actor_name: from_name,
        actor_avatar: from_avatar,
        title: `${from_name} sent you a Whiff 👃`,
        description: "Whiff back to show you're interested.",
        read: false,
      });
      base44.functions.invoke('sendPushNotification', {
        user_email: to_email,
        title: `👃 ${from_name} sent you a Whiff`,
        body: "Whiff back to show you're interested",
        data: { type: 'whiff', actor_email: from_email, url: '/matches' },
      }).catch(() => {});
    }

    return Response.json({ success: true, mutual });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}