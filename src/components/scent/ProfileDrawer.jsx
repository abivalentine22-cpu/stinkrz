import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Droplets, ShowerHead, MessageCircle, Wifi, WifiOff, Ban, Heart, ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";
import HangLooseLogo from "@/components/HangLooseLogo";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useFavorites } from "@/hooks/useFavorites";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const SCENT_COLORS = {
  Fresh: "#34d399",
  Musky: "#fbbf24",
  Ripe: "#f87171",
  Earthy: "#fb923c",
  Neutral: "#94a3b8",
};

export default function ProfileDrawer({ profile, open, onClose, onMessage, onReport }) {
  const ringColor = SCENT_COLORS[profile?.scent_category] || "#94a3b8";
  const intensityDots = Array.from({ length: 5 }, (_, i) => i < (profile?.scent_intensity || 0));
  const { isBlocked, blockUser, unblockUser } = useBlockedUsers();
  const { user } = useAuth();
  const { isFavorited, hasFavoritedMe, toggleFavorite } = useFavorites(user?.email);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const allPhotos = [
    ...(profile?.avatar_url ? [profile.avatar_url] : []),
    ...(profile?.photo_gallery || []),
  ];

  // Log profile view when drawer opens
  useEffect(() => {
    if (!open || !profile?.user_email || !user?.email) return;
    if (user.email !== profile.user_email) {
      base44.entities.ProfileView.create({ viewer_email: user.email, viewed_email: profile.user_email });
    }
    setGalleryIndex(0);
  }, [open, profile?.user_email]);

  const blocked = profile ? isBlocked(profile.user_email) : false;
  const favorited = profile ? isFavorited(profile.user_email) : false;
  const theyFavoritedMe = profile ? hasFavoritedMe(profile.user_email) : false;

  // Scent compatibility score (based on preferences overlap)
  const [myProfile, setMyProfile] = React.useState(null);
  React.useEffect(() => {
    if (!user?.email) return;
    base44.entities.ScentProfile.filter({ user_email: user.email }).then(ps => setMyProfile(ps[0] || null));
  }, [user?.email]);

  const compatScore = React.useMemo(() => {
    if (!myProfile || !profile) return null;
    const myPrefs = myProfile.scent_preferences || [];
    const theirCat = profile.scent_category;
    const theirPrefs = profile.scent_preferences || [];
    let score = 0;
    if (myPrefs.includes(theirCat)) score += 50;
    if (theirPrefs.includes(myProfile.scent_category)) score += 50;
    const sharedPrefs = myPrefs.filter(p => theirPrefs.includes(p)).length;
    score += Math.min(sharedPrefs * 10, 20);
    return Math.min(score, 100);
  }, [myProfile, profile]);

  // Last seen text
  const lastSeenText = React.useMemo(() => {
    if (!profile) return null;
    if (profile.is_online) return null;
    if (!profile.last_active) return "Last seen: unknown";
    const mins = (new Date() - new Date(profile.last_active)) / 60000;
    if (mins < 60) return `Last seen ${Math.round(mins)}m ago`;
    if (mins < 1440) return `Last seen ${Math.round(mins / 60)}h ago`;
    return `Last seen ${Math.round(mins / 1440)}d ago`;
  }, [profile]);

  const handleBlock = () => {
    if (!confirmBlock) { setConfirmBlock(true); return; }
    blockUser(profile.user_email);
    setConfirmBlock(false);
    onClose();
  };

  const handleUnblock = () => unblockUser(profile.user_email);

  const handleReport = () => {
    onClose();
    onReport?.(profile);
  };

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

            {/* Photo gallery hero */}
            <div style={{ position: "relative", height: "240px", flexShrink: 0, background: "hsl(258 30% 14%)" }}>
              {allPhotos.length > 0 ? (
                <>
                  <img
                    src={allPhotos[galleryIndex]}
                    alt={profile.display_name}
                    loading={galleryIndex === 0 ? "eager" : "lazy"}
                    style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
                  />
                  {allPhotos.length > 1 && (
                    <>
                      <button
                        onClick={() => setGalleryIndex(i => (i - 1 + allPhotos.length) % allPhotos.length)}
                        style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
                      ><ChevronLeft size={16} /></button>
                      <button
                        onClick={() => setGalleryIndex(i => (i + 1) % allPhotos.length)}
                        style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
                      ><ChevronRight size={16} /></button>
                      {/* Dots */}
                      <div style={{ position: "absolute", bottom: "40px", left: 0, right: 0, display: "flex", justifyContent: "center", gap: "4px" }}>
                        {allPhotos.map((_, i) => (
                          <div key={i} onClick={() => setGalleryIndex(i)} style={{ width: "6px", height: "6px", borderRadius: "50%", background: i === galleryIndex ? "#fff" : "rgba(255,255,255,0.35)", cursor: "pointer" }} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.25 }}>
          <HangLooseLogo size={80} />
        </div>
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, hsl(258 30% 10%) 0%, transparent 55%)" }} />
            </div>

            {/* Content */}
            <div style={{ padding: "16px 20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Name & status */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "22px", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
                    {profile.display_name}{profile.age ? `, ${profile.age}` : ""}
                  </h2>
                  {theyFavoritedMe && (
                    <span style={{ fontSize: "11px", color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "9999px", padding: "2px 8px" }}>
                      ❤️ Interested
                    </span>
                  )}
                  {profile.is_online ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#4ade80", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "9999px", padding: "2px 8px" }}>
                      <Wifi size={10} /> Online
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#64748b", background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: "9999px", padding: "2px 8px" }}>
                      <WifiOff size={10} /> {lastSeenText || "Away"}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "13px" }}>
                  <MapPin size={12} color="#a78bfa" />
                  {profile.distance} miles away
                </div>
              </div>

              {/* Vibe badges — pinned to top */}
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

              {profile.fetishes?.length > 0 && (
                <div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "8px", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fetishes & Kinks</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {profile.fetishes.map((fetish) => (
                      <span key={fetish} style={{
                        fontSize: "11px", fontFamily: "var(--font-body)",
                        padding: "3px 10px", borderRadius: "9999px",
                        background: "rgba(248,113,113,0.1)", color: "#f87171",
                        border: "1px solid rgba(248,113,113,0.2)",
                      }}>{fetish}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Compatibility score */}
              {compatScore !== null && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: compatScore >= 70 ? "rgba(74,222,128,0.08)" : compatScore >= 40 ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${compatScore >= 70 ? "rgba(74,222,128,0.25)" : compatScore >= 40 ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "9999px", padding: "5px 14px", alignSelf: "flex-start",
                }}>
                  <span style={{ fontSize: "13px" }}>{compatScore >= 70 ? "🔥" : compatScore >= 40 ? "✨" : "🤔"}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600, color: compatScore >= 70 ? "#4ade80" : compatScore >= 40 ? "#a78bfa" : "#94a3b8" }}>
                    {compatScore}% Scent Match
                  </span>
                </div>
              )}

              {/* Gender / Sexuality / Looking for */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {profile.gender && profile.gender !== "Prefer not to say" && (
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-body)", padding: "2px 10px", borderRadius: "9999px", background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
                    {profile.gender}
                  </span>
                )}
                {profile.sexuality && profile.sexuality !== "Prefer not to say" && (
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-body)", padding: "2px 10px", borderRadius: "9999px", background: "rgba(45,212,191,0.1)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.2)" }}>
                    {profile.sexuality}
                  </span>
                )}
                {profile.looking_for && (
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-body)", padding: "2px 10px", borderRadius: "9999px", background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
                    👀 {profile.looking_for}
                  </span>
                )}
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
                {profile.last_showered && (
                  <>
                    <div style={{ width: "1px", height: "32px", background: "rgba(255,255,255,0.08)" }} />
                    <div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px", fontFamily: "var(--font-body)" }}>Last Showered</div>
                      <div style={{ fontSize: "12px", color: "#e2e8f0", fontFamily: "var(--font-body)" }}>
                        {format(new Date(profile.last_showered), "MMM d")}
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

              {/* Actions */}
              <div style={{ marginTop: "auto", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {!blocked && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Button
                      onClick={() => onMessage?.(profile)}
                      className="flex-1 gap-2 font-body font-semibold"
                      style={{ height: "44px", fontSize: "15px" }}
                    >
                      <MessageCircle size={17} />
                      Send a Whiff
                    </Button>
                    <button
                      onClick={() => toggleFavorite(profile.user_email)}
                      style={{
                        width: "44px", height: "44px", borderRadius: "9999px", border: "none",
                        background: favorited ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.08)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", transition: "all 0.2s",
                        flexShrink: 0,
                      }}
                      title={favorited ? "Remove favorite" : "Tap / Favorite"}
                    >
                      <Heart size={18} color={favorited ? "#f87171" : "#94a3b8"} fill={favorited ? "#f87171" : "none"} />
                    </button>
                  </div>
                )}

                {blocked ? (
                  <Button
                    variant="outline"
                    onClick={handleUnblock}
                    className="w-full gap-2 font-body"
                    style={{ height: "40px", fontSize: "13px", borderColor: "rgba(255,255,255,0.12)", color: "#94a3b8" }}
                  >
                    <Ban size={14} />
                    Unblock {profile.display_name}
                  </Button>
                ) : (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Button
                      variant="ghost"
                      onClick={handleBlock}
                      className="flex-1 gap-2 font-body"
                      style={{
                        height: "36px", fontSize: "12px",
                        color: confirmBlock ? "#f87171" : "#64748b",
                        background: confirmBlock ? "rgba(248,113,113,0.08)" : "transparent",
                        border: confirmBlock ? "1px solid rgba(248,113,113,0.25)" : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <Ban size={13} />
                      {confirmBlock ? "Confirm block" : "Block"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleReport}
                      className="flex-1 gap-2 font-body"
                      style={{ height: "36px", fontSize: "12px", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <ShieldAlert size={13} />
                      Report
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}