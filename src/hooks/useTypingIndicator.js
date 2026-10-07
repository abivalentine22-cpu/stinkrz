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
  const lastBroadcastRef = useRef(0);
  const broadcastInFlightRef = useRef(false);
  const generationRef = useRef(0);

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

  // Send at most once every 2s, with only one request in flight. Previously
  // every keystroke sent a write and refresh, competing with message delivery.
  const broadcastTyping = useCallback(async () => {
    if (!myEmail || !partnerEmail) return;
    clearTimeout(broadcastTimeoutRef.current);
    broadcastTimeoutRef.current = setTimeout(() => {
      generationRef.current++;
      broadcastInFlightRef.current = false;
      lastBroadcastRef.current = 0;
      const record = myIndicatorRef.current;
      myIndicatorRef.current = null;
      if (record) base44.entities.TypingIndicator.delete(record.id).catch(() => {});
    }, 3000);

    if (broadcastInFlightRef.current || Date.now() - lastBroadcastRef.current < 2000) return;
    broadcastInFlightRef.current = true;
    lastBroadcastRef.current = Date.now();
    const generation = generationRef.current;
    try {
      const patch = { expires_at: new Date(Date.now() + 4000).toISOString() };
      const record = myIndicatorRef.current
        ? await base44.entities.TypingIndicator.update(myIndicatorRef.current.id, patch)
        : await base44.entities.TypingIndicator.create({ user_email: myEmail, conversation_partner: partnerEmail, ...patch });
      if (generation === generationRef.current) myIndicatorRef.current = record;
      else await base44.entities.TypingIndicator.delete(record.id).catch(() => {});
    } catch (_) {
      if (generation === generationRef.current) myIndicatorRef.current = null;
    } finally {
      if (generation === generationRef.current) broadcastInFlightRef.current = false;
    }
  }, [myEmail, partnerEmail]);

  // Cleanup on unmount / conversation change
  useEffect(() => {
    return () => {
      generationRef.current++;
      broadcastInFlightRef.current = false;
      lastBroadcastRef.current = 0;
      clearTimeout(broadcastTimeoutRef.current);
      if (myIndicatorRef.current) {
        base44.entities.TypingIndicator.delete(myIndicatorRef.current.id).catch(() => {});
        myIndicatorRef.current = null;
      }
    };
  }, [myEmail, partnerEmail]);

  return { isPartnerTyping, broadcastTyping };
}