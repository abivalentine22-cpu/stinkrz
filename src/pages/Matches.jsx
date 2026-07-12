import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import EmptyState from "@/components/EmptyState";

const SCENT_COLORS = {
  Fresh: "#34d399", Musky: "#fbbf24", Ripe: "#f87171",
  Earthy: "#fb923c", Neutral: "#94a3b8",
};

export default function Matches() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: sentFavs = [] } = useQuery({
    queryKey: ["sent-favs", user?.email],
    queryFn: () => base44.entities.Favorite.filter({ from_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: receivedFavs = [] } = useQuery({
    queryKey: ["received-favs", user?.email],
    queryFn: () => base44.entities.Favorite.filter({ to_email: user.email }),
    enabled: !!user?.email,
  });

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

  const sentSet = useMemo(() => new Set(sentFavs.map(f => f.to_email)), [sentFavs]);
  const receivedSet = useMemo(() => new Set(receivedFavs.map(f => f.from_email)), [receivedFavs]);

  const matches = useMemo(() =>
    [...sentSet].filter(e => receivedSet.has(e)).map(email => ({
      email,
      profile: profileMap[email],
      matchedAt: sentFavs.find(f => f.to_email === email)?.created_date,
    })),
    [sentSet, receivedSet, profileMap]
  );

  const pendingThem = useMemo(() =>
    [...sentSet].filter(e => !receivedSet.has(e)).map(email => ({
      email, profile: profileMap[email],
    })),
    [sentSet, receivedSet, profileMap]
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="w-5 h-5 text-red-400" />
        <h1 className="font-heading text-2xl font-bold">Matches</h1>
        <span className="ml-auto font-body text-sm text-muted-foreground">{matches.length} mutual</span>
      </div>

      {matches.length === 0 && pendingThem.length === 0 ? (
        <EmptyState
          className="py-16"
          icon="💞"
          title="No favorites yet"
          subtitle="Tap the star on profiles you like — when they star you back, it's a match ✨"
          actionLabel="Browse the Scent Block"
          to="/scent-block"
        />
      ) : (
        <>
          {matches.length > 0 && (
            <section className="mb-8">
              <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">💞 Mutual Matches</h2>
              <div className="space-y-3">
                {matches.map(({ email, profile, matchedAt }) => (
                  <MatchCard key={email} email={email} profile={profile} matchedAt={matchedAt} isMutual navigate={navigate} />
                ))}
              </div>
            </section>
          )}

          {pendingThem.length > 0 && (
            <section>
              <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">🤍 Waiting on Them</h2>
              <div className="space-y-3">
                {pendingThem.map(({ email, profile }) => (
                  <MatchCard key={email} email={email} profile={profile} navigate={navigate} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function MatchCard({ email, profile, matchedAt, isMutual, navigate }) {
  const color = SCENT_COLORS[profile?.scent_category] || "#94a3b8";
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
      style={{ borderColor: isMutual ? "rgba(248,113,113,0.3)" : undefined }}>
      <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center"
        style={{ border: `2px solid ${isMutual ? "#f87171" : color}` }}>
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          : <span className="text-xl">🤙</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-body font-semibold text-sm truncate">{profile?.display_name || email}</p>
          {isMutual && <span className="text-[10px] bg-red-400/10 border border-red-400/25 text-red-400 rounded-full px-2 py-0.5 font-body font-semibold shrink-0">Match ✨</span>}
        </div>
        <p className="font-body text-xs text-muted-foreground">
          {profile?.scent_category && <span style={{ color }}>{profile.scent_category}</span>}
          {profile?.age && ` · ${profile.age}`}
          {matchedAt && ` · matched ${formatDistanceToNow(new Date(matchedAt), { addSuffix: true })}`}
        </p>
        {profile?.looking_for && (
          <p className="font-body text-xs text-muted-foreground/70 mt-0.5">Looking for: {profile.looking_for}</p>
        )}
      </div>
      {isMutual && (
        <Button size="sm" className="font-body text-xs px-3 h-8 gap-1 shrink-0"
          onClick={() => navigate("/messages", { state: { openConversationWith: profile || { user_email: email } } })}>
          <MessageCircle className="w-3 h-3" /> Chat
        </Button>
      )}
    </div>
  );
}