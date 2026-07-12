import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Owns the chat scroll container: tracks whether the user is near the bottom,
 * auto-scrolls on new messages (only if they're already near the bottom or the
 * new message is their own), surfaces a "new messages" jump button when
 * scrolled up, and resets on conversation switch.
 */
export function useChatAutoScroll({ messages, myEmail, onReceiveSound, conversationKey }) {
  const scrollRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distFromBottom < 80;
    setShowScrollDown(distFromBottom > 120);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Auto-scroll logic
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isInitialLoad = prevMsgCountRef.current === 0 && messages.length > 0;
    if (isInitialLoad) {
      el.scrollTop = el.scrollHeight;
    } else if (messages.length > prevMsgCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      const isMyMsg = lastMsg?.sender_email === myEmail;
      if (isNearBottomRef.current || isMyMsg) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      } else {
        // New message from partner while scrolled up — show jump button
        setShowScrollDown(true);
        // Play receive sound for incoming messages
        if (!isMyMsg) onReceiveSound();
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset scroll state on conversation switch
  useEffect(() => {
    setShowScrollDown(false);
    prevMsgCountRef.current = 0;
    isNearBottomRef.current = true;
  }, [conversationKey]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setShowScrollDown(false);
  }, []);

  return { scrollRef, showScrollDown, scrollToBottom };
}