import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import { useFavorites } from "@/hooks/useFavorites";

const SCENT_COLORS = {
  Fresh: "#34d399", Musky: "#fbbf24", Ripe: "#f87171",
  Earthy: "#fb923c", Neutral: "#94a3b8",
};

export default function Matches() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { favorites, favoritedBy, sendWhiff } = useFavorites(user?.email);

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: () => base44.entities.ScentProfile.list(),
    enabled: !!user?.email,
    staleTime: 5 * 60_000,
  });

  const profileMap = useMemo(() => {
    const m = {};
    profiles.forEach(p => { m[p.user_email] = p; });
    return m;
  }, [profiles]);

  // favorites = who I whiffed; favoritedBy = who whiffed me.
  const matches = useMemo(() => favorites.filter(e => favoritedBy.includes(e)), [favorites, favoritedBy]);
  const pendingMe = useMemo(() => favoritedBy.filter(e => !favorites.includes(e)), [favorites, favoritedBy]);
  const pendingThem = useMemo(() => favorites.filter(e => !favoritedBy.includes(e)), [favorites, favoritedBy]);

  const goToMessage = (profile, email) =>
    navigate("/messages", { state: { openConversationWith: profile || { user_email: email } } });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Wind className="w-5 h-5 text-primary" />
        <h1 className="font-heading text-2xl font-bold">Whiffs</h1>
        <span className="ml-auto font-body text-sm text-muted-foreground">{matches.length} mutual</span>
      </div>

      {matches.length === 0 && pendingMe.length === 0 && pendingThem.length === 0 ? (
        <EmptyState
          className="py-16"
          icon="👃"
          title="No whiffs yet"
          subtitle="Send a Whiff on profiles you like — when they whiff you back, you've caught each other's scent ✨"
          actionLabel="Browse the Scent Block"
          to="/scent-block"
        />
      ) : (
        <>
          {matches.length > 0 && (
            <section className="mb-8">
              <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">👃 Mutual Whiffs</h2>
              <div className="space-y-3">
                {matches.map((email) => (
                  <WhiffCard
                    key={email}
                    email={email}
                    profile={profileMap[email]}
                    mutual
                    onMessage={() => goToMessage(profileMap[email], email)}
                  />
                ))}
              </div>
            </section>
          )}

          {pendingMe.length > 0 && (
            <section className="mb-8">
              <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">👃 Whiffed You</h2>
              <div className="space-y-3">
                {pendingMe.map((email) => (
                  <WhiffCard
                    key={email}
                    email={email}
                    profile={profileMap[email]}
                    onWhiffBack={() => sendWhiff(email)}
                    onMessage={() => goToMessage(profileMap[email], email)}
                  />
                ))}
              </div>
            </section>
          )}

          {pendingThem.length > 0 && (
            <section>
              <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">⏳ Waiting on Them</h2>
              <div className="space-y-3">
                {pendingThem.map((email) => (
                  <WhiffCard key={email} email={email} profile={profileMap[email]} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function WhiffCard({ email, profile, mutual, onWhiffBack, onMessage }) {
  const color = SCENT_COLORS[profile?.scent_category] || "#94a3b8";
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
      style={{ borderColor: mutual ? "rgba(167,139,250,0.3)" : undefined }}>
      <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center"
        style={{ border: `2px solid ${mutual ? "#a78bfa" : color}` }}>
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          : <span className="text-xl">🤙</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-body font-semibold text-sm truncate">{profile?.display_name || email}</p>
          {mutual && <span className="text-[10px] bg-primary/10 border border-primary/25 text-primary rounded-full px-2 py-0.5 font-body font-semibold shrink-0">Mutual ✨</span>}
        </div>
        <p className="font-body text-xs text-muted-foreground">
          {profile?.scent_category && <span style={{ color }}>{profile.scent_category}</span>}
          {profile?.age && ` · ${profile.age}`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onWhiffBack && (
          <Button size="sm" variant="outline" className="font-body text-xs px-3 h-8 gap-1"
            onClick={onWhiffBack}>
            👃 Whiff Back
          </Button>
        )}
        {onMessage && (
          <Button size="sm" className="font-body text-xs px-3 h-8 gap-1"
            onClick={onMessage}>
            <MessageCircle className="w-3 h-3" /> Message
          </Button>
        )}
      </div>
    </div>
  );
}