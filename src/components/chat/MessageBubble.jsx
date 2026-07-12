import React from "react";
import { format } from "date-fns";
import { Loader } from "lucide-react";
import { REACTION_EMOJIS } from "./chatConstants";

export default function MessageBubble({
  msg,
  me,
  reactions,
  activePickerMsgId,
  hideReadReceipts,
  onTogglePicker,
  onClosePicker,
  onReact,
}) {
  const isMe = msg.sender_email === me?.email;
  const msgReactions = reactions[msg.id] || [];
  const reactionGroups = msgReactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r.user_email);
    return acc;
  }, {});
  const showPicker = activePickerMsgId === msg.id;

  return (
    <div
      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
      onMouseLeave={onClosePicker}
    >
      <div className="relative group">
        {/* Reaction picker trigger */}
        {!msg._optimistic && (
          <button
            onClick={() => onTogglePicker(msg.id)}
            className={`absolute ${isMe ? "-left-7" : "-right-7"} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-base z-10 hover:scale-110`}
            title="React"
          >
            😄
          </button>
        )}

        {/* Reaction picker dropdown */}
        {showPicker && (
          <div
            className={`absolute ${isMe ? "right-full mr-2" : "left-full ml-2"} top-0 z-20 flex gap-1 bg-card border border-border rounded-full px-2 py-1 shadow-lg`}
            onMouseLeave={onClosePicker}
          >
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                className="text-lg hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 transition-opacity ${
          msg._optimistic ? "opacity-60" : "opacity-100"
        } ${
          msg.is_sticker
            ? "bg-transparent text-3xl text-center"
            : isMe
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        }`}>
          {msg.media_url && msg.media_type === "image" && (
            <img src={msg.media_url} alt="shared" className="max-w-full rounded-lg mb-2" />
          )}
          {msg.media_url && msg.media_type === "video" && (
            <video controls className="max-w-full rounded-lg mb-2" style={{ maxHeight: "300px" }}>
              <source src={msg.media_url} type="video/mp4" />
            </video>
          )}
          <p className={msg.is_sticker ? "text-3xl" : "font-body text-sm"}>{msg.content}</p>
          <p className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
            {msg._optimistic
              ? <><Loader className="w-2.5 h-2.5 animate-spin inline" /> Sending…</>
              : format(new Date(msg.created_date), "h:mm a")
            }
            {isMe && !msg._optimistic && !hideReadReceipts && (
              <span style={{ fontSize: "10px" }} title={msg.read ? "Read" : "Sent"}>
                {msg.read ? "✓✓" : "✓"}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Reactions below bubble */}
      {Object.keys(reactionGroups).length > 0 && (
        <div className={`flex gap-1 mt-1 flex-wrap ${isMe ? "justify-end" : "justify-start"}`}>
          {Object.entries(reactionGroups).map(([emoji, users]) => {
            const iMine = users.includes(me?.email);
            return (
              <button
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex items-center gap-0.5 ${
                  iMine
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-muted/60 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {emoji}{users.length > 1 && <span className="ml-0.5">{users.length}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}