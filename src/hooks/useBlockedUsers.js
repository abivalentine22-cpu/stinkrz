import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// DB-backed block list — persists across devices
export function useBlockedUsers() {
  const { user } = useAuth();
  const [blockedEmails, setBlockedEmails] = useState([]);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.BlockedUser.filter({ blocker_email: user.email })
      .then(rows => setBlockedEmails(rows.map(r => r.blocked_email)));

    const unsub = base44.entities.BlockedUser.subscribe((event) => {
      if (event.data?.blocker_email !== user.email) return;
      if (event.type === "create") {
        setBlockedEmails(prev => [...new Set([...prev, event.data.blocked_email])]);
      } else if (event.type === "delete") {
        base44.entities.BlockedUser.filter({ blocker_email: user.email })
          .then(rows => setBlockedEmails(rows.map(r => r.blocked_email)));
      }
    });
    return unsub;
  }, [user?.email]);

  const blockUser = useCallback(async (email) => {
    if (!user?.email || blockedEmails.includes(email)) return;
    setBlockedEmails(prev => [...prev, email]); // optimistic
    await base44.entities.BlockedUser.create({ blocker_email: user.email, blocked_email: email });
  }, [user?.email, blockedEmails]);

  const unblockUser = useCallback(async (email) => {
    if (!user?.email) return;
    setBlockedEmails(prev => prev.filter(e => e !== email)); // optimistic
    const rows = await base44.entities.BlockedUser.filter({ blocker_email: user.email, blocked_email: email });
    await Promise.all(rows.map(r => base44.entities.BlockedUser.delete(r.id)));
  }, [user?.email]);

  const isBlocked = useCallback((email) => blockedEmails.includes(email), [blockedEmails]);

  return { blockedUsers: blockedEmails, blockUser, unblockUser, isBlocked };
}