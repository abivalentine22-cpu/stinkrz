import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Deletes all data associated with the current user's account
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = user.email;

    // Delete all user data in parallel
    const [profiles, prefs, messages_sent, messages_recv, favorites_from, favorites_to, views_from, views_to, statuses, notifications, reports, reactions, typing] = await Promise.all([
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
    ]);

    const all = [
      ...profiles, ...prefs,
      ...messages_sent, ...messages_recv,
      ...favorites_from, ...favorites_to,
      ...views_from, ...views_to,
      ...statuses, ...notifications, ...reports,
      ...reactions, ...typing,
    ];

    // Deduplicate by id then delete
    const unique = [...new Map(all.map(r => [r.id, r])).values()];
    await Promise.all(unique.map(r => {
      const entityName = r.__entity_name || null;
      // Use ScentProfile entity as fallback — we'll delete by iterating each group
      return Promise.resolve();
    }));

    // Delete each group explicitly
    await Promise.all([
      ...profiles.map(r => base44.asServiceRole.entities.ScentProfile.delete(r.id)),
      ...prefs.map(r => base44.asServiceRole.entities.UserPreferences.delete(r.id)),
      ...messages_sent.map(r => base44.asServiceRole.entities.ChatMessage.delete(r.id)),
      ...messages_recv.map(r => base44.asServiceRole.entities.ChatMessage.delete(r.id)),
      ...favorites_from.map(r => base44.asServiceRole.entities.Favorite.delete(r.id)),
      ...favorites_to.map(r => base44.asServiceRole.entities.Favorite.delete(r.id)),
      ...views_from.map(r => base44.asServiceRole.entities.ProfileView.delete(r.id)),
      ...views_to.map(r => base44.asServiceRole.entities.ProfileView.delete(r.id)),
      ...statuses.map(r => base44.asServiceRole.entities.StatusPost.delete(r.id)),
      ...notifications.map(r => base44.asServiceRole.entities.Notification.delete(r.id)),
      ...reports.map(r => base44.asServiceRole.entities.Report.delete(r.id)),
      ...reactions.map(r => base44.asServiceRole.entities.MessageReaction.delete(r.id)),
      ...typing.map(r => base44.asServiceRole.entities.TypingIndicator.delete(r.id)),
    ]);

    return Response.json({ success: true, deleted_records: unique.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});