import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Deletes all data associated with the current user's account
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = user.email;

    // Delete all user data in parallel
    const [profiles, prefs, messages_sent, messages_recv, favorites_from, favorites_to, views_from, views_to, statuses, notifications, reports_filed, reactions, typing, blocked_by, blocked_others, notif_actor] = await Promise.all([
      base44.asServiceRole.entities.ScentProfile.filter({ user_email: email }),
      base44.asServiceRole.entities.UserPreferences.filter({ user_email: email }),
      base44.asServiceRole.entities.ChatMessage.filter({ sender_email: email }),
      base44.asServiceRole.entities.ChatMessage.filter({ receiver_email: email }),
      base44.asServiceRole.entities.Favorite.filter({ from_email: email }),
      base44.asServiceRole.entities.Favorite.filter({ to_email: email }),
      base44.asServiceRole.entities.ProfileView.filter({ viewer_email: email }),
      base44.asServiceRole.entities.ProfileView.filter({ viewed_email: email }),
      base44.asServiceRole.entities.StatusPost.filter({ user_email: email }),
      base44.asServiceRole.entities.Notification.filter({ user_email: email }),
      base44.asServiceRole.entities.Report.filter({ reporter_email: email }),
      base44.asServiceRole.entities.MessageReaction.filter({ user_email: email }),
      base44.asServiceRole.entities.TypingIndicator.filter({ user_email: email }),
      base44.asServiceRole.entities.BlockedUser.filter({ blocked_email: email }),
      base44.asServiceRole.entities.BlockedUser.filter({ blocker_email: email }),
      base44.asServiceRole.entities.Notification.filter({ actor_email: email }),
    ]);

    // Delete everything in parallel, deduplicating messages by id
    const msgIds = new Set();
    const uniqueMessages = [...messages_sent, ...messages_recv].filter(r => {
      if (msgIds.has(r.id)) return false;
      msgIds.add(r.id);
      return true;
    });

    const notifIds = new Set();
    const uniqueNotifs = [...notifications, ...notif_actor].filter(r => {
      if (notifIds.has(r.id)) return false;
      notifIds.add(r.id);
      return true;
    });

    await Promise.all([
      ...profiles.map(r => base44.asServiceRole.entities.ScentProfile.delete(r.id)),
      ...prefs.map(r => base44.asServiceRole.entities.UserPreferences.delete(r.id)),
      ...uniqueMessages.map(r => base44.asServiceRole.entities.ChatMessage.delete(r.id)),
      ...favorites_from.map(r => base44.asServiceRole.entities.Favorite.delete(r.id)),
      ...favorites_to.map(r => base44.asServiceRole.entities.Favorite.delete(r.id)),
      ...views_from.map(r => base44.asServiceRole.entities.ProfileView.delete(r.id)),
      ...views_to.map(r => base44.asServiceRole.entities.ProfileView.delete(r.id)),
      ...statuses.map(r => base44.asServiceRole.entities.StatusPost.delete(r.id)),
      ...uniqueNotifs.map(r => base44.asServiceRole.entities.Notification.delete(r.id)),
      ...reports_filed.map(r => base44.asServiceRole.entities.Report.delete(r.id)),
      ...reactions.map(r => base44.asServiceRole.entities.MessageReaction.delete(r.id)),
      ...typing.map(r => base44.asServiceRole.entities.TypingIndicator.delete(r.id)),
      ...blocked_by.map(r => base44.asServiceRole.entities.BlockedUser.delete(r.id)),
      ...blocked_others.map(r => base44.asServiceRole.entities.BlockedUser.delete(r.id)),
    ]);

    const totalDeleted = profiles.length + prefs.length + uniqueMessages.length + favorites_from.length + favorites_to.length + views_from.length + views_to.length + statuses.length + uniqueNotifs.length + reports_filed.length + reactions.length + typing.length + blocked_by.length + blocked_others.length;
    return Response.json({ success: true, deleted_records: totalDeleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});