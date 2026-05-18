import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called every 15 minutes — emails users who received messages while inactive
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Find unread messages created in last 15 mins
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const unread = await base44.asServiceRole.entities.ChatMessage.list();
    const recent = unread.filter(m => !m.read && m.created_date >= since);

    // Group by receiver
    const byReceiver = {};
    for (const m of recent) {
      if (!byReceiver[m.receiver_email]) byReceiver[m.receiver_email] = [];
      byReceiver[m.receiver_email].push(m);
    }

    // For each receiver, check if they were active in last 15 mins
    const profiles = await base44.asServiceRole.entities.ScentProfile.list();
    const profileMap = {};
    for (const p of profiles) profileMap[p.user_email] = p;

    let sent = 0;
    for (const [email, msgs] of Object.entries(byReceiver)) {
      const profile = profileMap[email];
      const lastActive = profile?.last_active ? new Date(profile.last_active) : null;
      const isActive = lastActive && (Date.now() - lastActive.getTime()) < 15 * 60 * 1000;
      if (isActive) continue; // they're online, skip

      const count = msgs.length;
      const senderName = msgs[0] ? (profileMap[msgs[0].sender_email]?.display_name || 'Someone') : 'Someone';
      const subject = count === 1
        ? `💨 ${senderName} sent you a message on Stinkrz`
        : `💨 You have ${count} new messages on Stinkrz`;

      const appUrl = `https://stinkrz.base44.app/messages?with=${msgs[0]?.sender_email || ''}`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject,
        body: `Hey! You've got ${count === 1 ? 'a new message' : `${count} new messages`} waiting on Stinkrz.\n\n${senderName} reached out — don't leave them hanging.\n\nView your messages: ${appUrl}\n\n— The Stinkrz crew 🤙`,
      });
      sent++;
    }

    return Response.json({ sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});