import React from "react";
import { Button } from "@/components/ui/button";
import HangLooseLogo from "@/components/HangLooseLogo";
import TypingDots from "./TypingDots";

export default function ChatHeader({ profile, partnerName, isPartnerTyping, onVibeCheck, onOpenProfile }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenProfile}
          disabled={!profile}
          className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-default disabled:hover:scale-100"
          title={profile ? `View ${partnerName}'s profile` : ""}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="opacity-30"><HangLooseLogo size={22} /></div>
          )}
        </button>
        <button
          type="button"
          onClick={onOpenProfile}
          disabled={!profile}
          className="text-left transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-default disabled:hover:scale-100"
          title={profile ? `View ${partnerName}'s profile` : ""}
        >
          <h3 className="font-heading font-semibold text-sm">{partnerName}</h3>
          {isPartnerTyping ? (
            <span className="text-xs text-primary font-body flex items-center gap-1">
              <TypingDots /> typing…
            </span>
          ) : profile?.is_online ? (
            <span className="text-xs text-green-400 font-body">Online</span>
          ) : null}
        </button>
      </div>
      <Button variant="ghost" size="sm" onClick={onVibeCheck} className="gap-1.5 text-accent hover:text-accent font-body">
        <span className="text-lg">🤙</span>
        Vibe Check
      </Button>
    </div>
  );
}