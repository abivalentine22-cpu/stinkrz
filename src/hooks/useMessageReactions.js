import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Loads and subscribes to reactions for messages in a conversation.
 * Returns a map: { [messageId]: [{ emoji, user_email, id }] }
 * and a toggleReaction(messageId, emoji) function.
 */
export function useMessageReactions(messages, myEmail) {
  const [reactions, setReactions] = useState({});

  const hasMessages = !!messages?.length;

  // The shared channel supplies the authorized initial snapshot and updates.
  // Avoid a separate request for every message, and poll only with a chat open.
  useEffect(() => {
    setReactions({});
    if (!myEmail || !hasMessages) return;
    const unsub = base44.entities.MessageReaction.subscribe((event) => {
      const d = event.data;
      if (!d) return;
      if (event.type === "create") {
        setReactions(prev => ({
          ...prev,
          [d.message_id]: [...(prev[d.message_id] || []).filter(r => r.id !== d.id), d],
        }));
      } else if (event.type === "delete") {
        setReactions(prev => {
          const next = { ...prev };
          for (const msgId in next) {
            next[msgId] = next[msgId].filter(r => r.id !== event.id);
          }
          return next;
        });
      }
    });
    return unsub;
  }, [myEmail, hasMessages]);

  const toggleReaction = async (messageId, emoji) => {
    const existing = (reactions[messageId] || []).find(
      r => r.user_email === myEmail && r.emoji === emoji
    );
    if (existing) {
      await base44.entities.MessageReaction.delete(existing.id);
    } else {
      await base44.entities.MessageReaction.create({ message_id: messageId, user_email: myEmail, emoji });
    }
  };

  return { reactions, toggleReaction };
}