import React from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function ChatList({ chats, activeChat, onSelect }) {
  return (
    <div className="space-y-1">
      {chats.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onSelect(chat)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
            activeChat?.id === chat.id
              ? "bg-primary/10 border border-primary/20"
              : "hover:bg-muted/50 border border-transparent"
          }`}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
              {chat.partner.avatar_url ? (
                <img src={chat.partner.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">🤙</div>
              )}
            </div>
            {chat.partner.is_online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 ring-2 ring-card" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-heading font-semibold text-sm truncate">{chat.partner.display_name}</span>
              <span className="text-[10px] font-body text-muted-foreground shrink-0">
                {format(new Date(chat.timestamp), "h:mm a")}
              </span>
            </div>
            <p className="font-body text-xs text-muted-foreground truncate mt-0.5">{chat.lastMessage}</p>
          </div>

          {chat.unread > 0 && (
            <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full">
              {chat.unread}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}