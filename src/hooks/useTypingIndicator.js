import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Manages typing indicator for a conversation.
 * - broadcastTyping(): call when user types
 * - isPartnerTyping: true when the other person is typing
 */
export function useTypingIndicator(myEmail, partnerEmail) {
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const myIndicatorRef = useRef(null); // current TypingIndicator record for "me"
  const broadcastTimeoutRef = useRef(null);
  const partnerTimeoutRef = useRef(null);

  // Subscribe to partner's typing indicator
  useEffect(() => {
    if (!myEmail || !partnerEmail) return;

    let lastPartnerTypingId = null;

    const unsub = base44.entities.TypingIndicator.subscribe((event) => {
      const d = event.data;
      if (!d) return;
      // Partner typing to me
      if (d.user_email === partnerEmail && d.conversation_partner === myEmail) {
        if (event.type === "create" || event.type === "update") {
          lastPartnerTypingId = event.id;
          setIsPartnerTyping(true);
          clearTimeout(partnerTimeoutRef.current);
          // Auto-clear after 4s in case we miss the delete event
          partnerTimeoutRef.current = setTimeout(() => setIsPartnerTyping(false), 4000);
        } else if (event.type === "delete" && event.id === lastPartnerTypingId) {
          clearTimeout(partnerTimeoutRef.current);
          setIsPartnerTyping(false);
        }
      }
    });

    return () => {
      unsub();
      clearTimeout(partnerTimeoutRef.current);
    };
  }, [myEmail, partnerEmail]);

  // Broadcast "I'm typing" — debounced, auto-clears after 3s idle
  const broadcastTyping = useCallback(async () => {
    if (!myEmail || !partnerEmail) return;
    clearTimeout(broadcastTimeoutRef.current);

    // Create or refresh the indicator
    if (!myIndicatorRef.current) {
      try {
        const record = await base44.entities.TypingIndicator.create({
          user_email: myEmail,
          conversation_partner: partnerEmail,
          expires_at: new Date(Date.now() + 4000).toISOString(),
        });
        myIndicatorRef.current = record;
      } catch (_) {}
    } else {
      try {
        await base44.entities.TypingIndicator.update(myIndicatorRef.current.id, {
          expires_at: new Date(Date.now() + 4000).toISOString(),
        });
      } catch (_) {}
    }

    // Stop broadcasting after 3s of no typing
    broadcastTimeoutRef.current = setTimeout(async () => {
      if (myIndicatorRef.current) {
        try { await base44.entities.TypingIndicator.delete(myIndicatorRef.current.id); } catch (_) {}
        myIndicatorRef.current = null;
      }
    }, 3000);
  }, [myEmail, partnerEmail]);

  // Cleanup on unmount / conversation change
  useEffect(() => {
    return () => {
      clearTimeout(broadcastTimeoutRef.current);
      if (myIndicatorRef.current) {
        base44.entities.TypingIndicator.delete(myIndicatorRef.current.id).catch(() => {});
        myIndicatorRef.current = null;
      }
    };
  }, [myEmail, partnerEmail]);

  return { isPartnerTyping, broadcastTyping };
}