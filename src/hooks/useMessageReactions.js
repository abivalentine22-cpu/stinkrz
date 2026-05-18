import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Loads and subscribes to reactions for messages in a conversation.
 * Returns a map: { [messageId]: [{ emoji, user_email, id }] }
 * and a toggleReaction(messageId, emoji) function.
 */
export function useMessageReactions(messages, myEmail) {
  const [reactions, setReactions] = useState({});

  // Load reactions for all visible messages
  useEffect(() => {
    if (!messages?.length) return;
    const ids = messages.map(m => m.id);
    // Fetch in bulk — filter by message_id in the set
    Promise.all(ids.map(id => base44.entities.MessageReaction.filter({ message_id: id })))
      .then(results => {
        const map = {};
        ids.forEach((id, i) => { map[id] = results[i] || []; });
        setReactions(map);
      })
      .catch(() => {});
  }, [messages?.map(m => m.id).join(",")]);

  // Subscribe to reaction changes
  useEffect(() => {
    const unsub = base44.entities.MessageReaction.subscribe((event) => {
      const d = event.data;
      if (!d) return;
      if (event.type === "create") {
        setReactions(prev => ({
          ...prev,
          [d.message_id]: [...(prev[d.message_id] || []), d],
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
  }, []);

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