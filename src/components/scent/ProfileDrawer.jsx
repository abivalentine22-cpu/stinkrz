import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Droplets, ShowerHead, MessageCircle, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const SCENT_COLORS = {
  Fresh: "#34d399",
  Musky: "#fbbf24",
  Ripe: "#f87171",
  Earthy: "#fb923c",
  Neutral: "#94a3b8",
};

export default function ProfileDrawer({ profile, open, onClose, onMessage }) {
  const ringColor = SCENT_COLORS[profile?.scent_category] || "#94a3b8";
  const intensityDots = Array.from({ length: 5 }, (_, i) => i < (profile?.scent_intensity || 0));

  return (
    <AnimatePresence>
      {open && profile && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "absolute", inset: 0, zIndex: 1100,
              background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)",
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            style={{
              position: "absolute", top: 0, right: 0, bottom: 0,
              width: "min(360px, 100%)",
              zIndex: 1200,
              background: "hsl(258 30% 10%)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.6)",
              display: "flex", flexDirection: "column",
              overflowY: "auto",
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                position: "absolute", top: "14px", right: "14px",
                width: "32px", height: "32px", borderRadius: "50%",
                background: "rgba(255,255,255,0.08)", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#94a3b8", zIndex: 10,
              }}
            >
              <X size={16} />
            </button>

            {/* Hero */}
            <div style={{ position: "relative", height: "220px", flexShrink: 0, background: "hsl(258 30% 14%)" }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "72px", opacity: 0.2 }}>🤙</div>
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, hsl(258 30% 10%) 0%, transparent 60%)" }} />
            </div>

            {/* Content */}
            <div style={{ padding: "16px 20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Name & status */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "22px", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
                    {profile.display_name}, {profile.age}
                  </h2>
                  {profile.is_online ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#4ade80", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "9999px", padding: "2px 8px" }}>
                      <Wifi size={10} /> Online
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#64748b", background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: "9999px", padding: "2px 8px" }}>
                      <WifiOff size={10} /> Away
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "13px" }}>
                  <MapPin size={12} color="#a78bfa" />
                  {profile.distance} miles away
                </div>
              </div>

              {/* Scent stats */}
              <div style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px", padding: "12px 14px",
                display: "flex", gap: "16px", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px", fontFamily: "var(--font-body)" }}>Scent</div>
                  <div style={{ fontWeight: 700, color: ringColor, fontSize: "14px", fontFamily: "var(--font-heading)" }}>{profile.scent_category}</div>
                </div>
                <div style={{ width: "1px", height: "32px", background: "rgba(255,255,255,0.08)" }} />
                <div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px", fontFamily: "var(--font-body)" }}>Intensity</div>
                  <div style={{ display: "flex", gap: "2px" }}>
                    {intensityDots.map((filled, i) => (
                      <Droplets key={i} size={12} color={filled ? "#a78bfa" : "rgba(255,255,255,0.1)"} />
                    ))}
                  </div>
                </div>
                {profile.shower_frequency && (
                  <>
                    <div style={{ width: "1px", height: "32px", background: "rgba(255,255,255,0.08)" }} />
                    <div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px", fontFamily: "var(--font-body)" }}>Showers</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#e2e8f0", fontFamily: "var(--font-body)" }}>
                        <ShowerHead size={11} color="#2dd4bf" />
                        {profile.shower_frequency}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
                  {profile.bio}
                </p>
              )}

              {/* Last showered */}
              {profile.last_showered && (
                <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "var(--font-body)" }}>
                  Last showered: {format(new Date(profile.last_showered), "MMM d, yyyy")}
                </div>
              )}

              {/* Vibe badges */}
              {profile.vibe_badges?.length > 0 && (
                <div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "8px", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Vibe Check</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {profile.vibe_badges.map((badge) => (
                      <span key={badge} style={{
                        fontSize: "11px", fontFamily: "var(--font-body)",
                        padding: "3px 10px", borderRadius: "9999px",
                        background: "rgba(167,139,250,0.1)", color: "#a78bfa",
                        border: "1px solid rgba(167,139,250,0.2)",
                      }}>{badge}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Personality prompts */}
              {profile.personality_prompts?.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {profile.personality_prompts.map((p, i) => (
                    <div key={i} style={{
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "10px", padding: "10px 12px",
                    }}>
                      <div style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-body)", marginBottom: "3px" }}>{p.prompt}</div>
                      <div style={{ fontSize: "13px", color: "#e2e8f0", fontFamily: "var(--font-body)", fontWeight: 500 }}>{p.answer}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Send Message button */}
              <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                <Button
                  onClick={() => onMessage?.(profile)}
                  className="w-full gap-2 font-body font-semibold"
                  style={{ height: "44px", fontSize: "15px" }}
                >
                  <MessageCircle size={17} />
                  Send a Whiff
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}