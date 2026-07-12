import React from "react";
import { Button } from "@/components/ui/button";
import HangLooseLogo from "@/components/HangLooseLogo";
import TypingDots from "./TypingDots";

export default function ChatHeader({ profile, partnerName, isPartnerTyping, onVibeCheck }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="opacity-30"><HangLooseLogo size={22} /></div>
          )}
        </div>
        <div>
          <h3 className="font-heading font-semibold text-sm">{partnerName}</h3>
          {isPartnerTyping ? (
            <span className="text-xs text-primary font-body flex items-center gap-1">
              <TypingDots /> typing…
            </span>
          ) : profile?.is_online ? (
            <span className="text-xs text-green-400 font-body">Online</span>
          ) : null}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onVibeCheck} className="gap-1.5 text-accent hover:text-accent font-body">
        <span className="text-lg">🤙</span>
        Vibe Check
      </Button>
    </div>
  );
}