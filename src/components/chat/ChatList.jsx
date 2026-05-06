import React from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function ChatList({ conversations, activeConversation, onSelect }) {
  return (
    <div className="space-y-1">
      {conversations.map((conv) => {
        const profile = conv.partnerProfile;
        const name = profile?.display_name || conv.partnerEmail;
        return (
          <button
            key={conv.partnerEmail}
            onClick={() => onSelect(conv)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
              activeConversation?.partnerEmail === conv.partnerEmail
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-muted/50 border border-transparent"
            }`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">🤙</div>
                )}
              </div>
              {profile?.is_online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 ring-2 ring-card" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-heading font-semibold text-sm truncate">{name}</span>
                <span className="text-[10px] font-body text-muted-foreground shrink-0">
                  {format(new Date(conv.lastMessage.created_date), "h:mm a")}
                </span>
              </div>
              <p className="font-body text-xs text-muted-foreground truncate mt-0.5">
                {conv.lastMessage.content}
              </p>
            </div>

            {conv.unread > 0 && (
              <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full">
                {conv.unread}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}