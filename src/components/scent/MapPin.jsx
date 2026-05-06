import React from "react";

const SCENT_RING = {
  Fresh: "#34d399",
  Musky: "#fbbf24",
  Ripe: "#f87171",
  Earthy: "#fb923c",
  Neutral: "#94a3b8",
};

export default function MapPin({ profile, onClick, isYou = false }) {
  const ringColor = SCENT_RING[profile.scent_category] || "#94a3b8";

  return (
    <div
      onClick={() => onClick?.(profile)}
      className="relative cursor-pointer group"
      style={{ transform: "translate(-50%, -50%)" }}
    >
      {/* Pulse ring for online users */}
      {profile.is_online && !isYou && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-40"
          style={{ backgroundColor: ringColor, borderRadius: "50%" }}
        />
      )}

      {/* Avatar circle */}
      <div
        className="relative w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold shadow-lg transition-transform group-hover:scale-110"
        style={{
          border: `3px solid ${isYou ? "#a78bfa" : ringColor}`,
          backgroundColor: "#1e1b3a",
          boxShadow: `0 0 12px ${isYou ? "#a78bfa88" : ringColor + "66"}`,
        }}
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl">🤙</span>
        )}
      </div>

      {/* Online dot */}
      {profile.is_online && (
        <span
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background"
          style={{ backgroundColor: "#4ade80" }}
        />
      )}

      {/* Name label */}
      {!isYou && (
        <div
          className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold px-2 py-0.5 rounded-full pointer-events-none"
          style={{ background: "rgba(15,12,35,0.85)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {profile.display_name}
        </div>
      )}

      {isYou && (
        <div
          className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold px-2 py-0.5 rounded-full pointer-events-none"
          style={{ background: "rgba(167,139,250,0.25)", color: "#a78bfa", border: "1px solid #a78bfa55" }}
        >
          🫵 You
        </div>
      )}
    </div>
  );
}