import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

// DB-backed block list — persists across devices
export function useBlockedUsers() {
  const { user } = useAuth();
  const [blockedEmails, setBlockedEmails] = useState([]);
  const pending = useRef(new Set());
  const revision = useRef(0);
  const { toast } = useToast();

  useEffect(() => {
    setBlockedEmails([]);
    pending.current.clear();
    revision.current++;
    if (!user?.email) return;
    let cancelled = false;
    const initialRevision = revision.current;
    // The gateway already restricts this list to the signed-in blocker. Match
    // the subscription read so both callers share one pending request.
    base44.entities.BlockedUser.list()
      .then(rows => { if (!cancelled && revision.current === initialRevision) setBlockedEmails(rows.map(r => r.blocked_email)); })
      .catch(() => {});

    const unsub = base44.entities.BlockedUser.subscribe((event) => {
      if (event.data?.blocker_email !== user.email || pending.current.has(event.data.blocked_email)) return;
      revision.current++;
      if (event.type === "create") {
        setBlockedEmails(prev => [...new Set([...prev, event.data.blocked_email])]);
      } else if (event.type === "delete") {
        setBlockedEmails(prev => prev.filter(e => e !== event.data.blocked_email));
      }
    });
    return () => { cancelled = true; unsub(); };
  }, [user?.email]);

  const blockUser = useCallback(async (email) => {
    if (!user?.email || !email || pending.current.has(email)) return false;
    if (blockedEmails.includes(email)) return true;
    pending.current.add(email);
    revision.current++;
    try {
      await base44.entities.BlockedUser.create({ blocker_email: user.email, blocked_email: email });
      setBlockedEmails(prev => [...new Set([...prev, email])]);
      return true;
    } catch {
      toast({ title: "Couldn't block this person", description: "The block wasn't confirmed. Please try again.", variant: "destructive" });
      return false;
    } finally { pending.current.delete(email); }
  }, [user?.email, blockedEmails, toast]);

  const unblockUser = useCallback(async (email) => {
    if (!user?.email || !email || pending.current.has(email)) return false;
    pending.current.add(email);
    revision.current++;
    try {
      // Remove duplicate records too. Keep the blocked status until every
      // deletion succeeds, including when a batch only partially completes.
      for (;;) {
        const rows = await base44.entities.BlockedUser.filter({ blocker_email: user.email, blocked_email: email });
        if (!rows.length) break;
        for (let start = 0; start < rows.length; start += 10) {
          await Promise.all(rows.slice(start, start + 10).map(r => base44.entities.BlockedUser.delete(r.id)));
        }
      }
      setBlockedEmails(prev => prev.filter(e => e !== email));
      return true;
    } catch {
      toast({ title: "Couldn't unblock this person", description: "The unblock wasn't confirmed. Please try again.", variant: "destructive" });
      return false;
    } finally { pending.current.delete(email); }
  }, [user?.email, toast]);

  const isBlocked = useCallback((email) => blockedEmails.includes(email), [blockedEmails]);

  return { blockedUsers: blockedEmails, blockUser, unblockUser, isBlocked };
}