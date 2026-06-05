import React from "react";
import HangLooseLogo from "@/components/HangLooseLogo";

/**
 * Shared avatar component.
 * Shows the user's photo if available, otherwise falls back to the HangLooseLogo.
 */
export default function UserAvatar({ avatarUrl, displayName, size = 40, className = "" }) {
  const style = { width: size, height: size };

  return (
    <div
      className={`rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center ${className}`}
      style={style}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={displayName || ""} className="w-full h-full object-cover" />
      ) : (
        <HangLooseLogo size={Math.round(size * 0.6)} className="opacity-40" />
      )}
    </div>
  );
}