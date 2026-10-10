import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 100;
// Read all pages before deleting so shifting offsets cannot skip records.
async function allMatching(entity, query) {
  const records = new Map();
  for (let skip = 0; ; ) {
    const page = await entity.filter(query, 'id', PAGE_SIZE, skip);
    for (const record of page) records.set(record.id, record);
    if (page.length < PAGE_SIZE) return [...records.values()];
    skip += page.length;
  }
}

async function deleteRecords(entity, records) {
  for (let offset = 0; offset < records.length; offset += 10) {
    const results = await Promise.allSettled(records.slice(offset, offset + 10).map(async record => {
      try {
        const result = await entity.delete(record.id);
        if (result?.success === false) throw new Error('Deletion failed');
      } catch (error) {
        // A concurrent deletion is already complete.
        if ((error?.response?.status ?? error?.status) !== 404) throw error;
      }
    }));
    if (results.some(result => result.status === 'rejected')) throw new Error('Cleanup incomplete');
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); }
    catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
    if (!user?.id || !user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // Never accept an account ID or email from the request body.
    const email = user.email;
    const entities = base44.asServiceRole.entities;
    const either = (...fields) => ({ $or: fields.map(field => ({ [field]: email })) });
    const queries: [string, Record<string, unknown>][] = [
      ['ScentProfile', { user_email: email }],
      ['UserPreferences', { user_email: email }],
      ['PushToken', { user_email: email }],
      ['Referral', either('referrer_email', 'referred_email')],
      ['ChatMessage', either('sender_email', 'receiver_email')],
      ['Favorite', either('from_email', 'to_email')],
      ['ProfileView', either('viewer_email', 'viewed_email')],
      ['StatusPost', { user_email: email }],
      ['Notification', either('user_email', 'actor_email')],
      ['Report', { reporter_email: email }],
      ['MessageReaction', { user_email: email }],
      ['TypingIndicator', either('user_email', 'conversation_partner')],
      ['BlockedUser', either('blocker_email', 'blocked_email')],
    ];
    const groups = [];
    for (const [name, query] of queries) {
      groups.push({ name, records: await allMatching(entities[name], query) });
    }
    const messages = groups.find(group => group.name === 'ChatMessage').records;
    const reactionGroup = groups.find(group => group.name === 'MessageReaction');
    const reactions = new Map(reactionGroup.records.map(record => [record.id, record]));
    for (let offset = 0; offset < messages.length; offset += 100) {
      const related = await allMatching(entities.MessageReaction, {
        message_id: { $in: messages.slice(offset, offset + 100).map(message => message.id) },
      });
      for (const record of related) reactions.set(record.id, record);
    }
    reactionGroup.records = [...reactions.values()];
    // Preserve moderation reports filed by other users, but remove this identity.
    const reportsAboutUser = await allMatching(entities.Report, { reported_user_email: email });
    for (const report of reportsAboutUser) {
      if (report.reporter_email === email) continue;
      await entities.Report.update(report.id, {
        reported_user_email: '[deleted]', reported_user_name: 'Deleted member',
      });
    }
    // Remove dependent reactions first so retries can still find message references.
    await deleteRecords(entities.MessageReaction, reactionGroup.records);
    for (const group of groups) {
      if (group.name !== 'MessageReaction') await deleteRecords(entities[group.name], group.records);
    }
    const deleted_records = groups.reduce((total, group) => total + group.records.length, 0);
    // The SDK's built-in User entity supports service-role deletion.
    const result = await entities.User.delete(user.id);
    if (result?.success === false) throw new Error('Account deletion incomplete');
    return Response.json({ success: true, account_deleted: true, deleted_records });
  } catch {
    return Response.json({ error: 'Account deletion did not complete. Please retry.' }, { status: 500 });
  }
});