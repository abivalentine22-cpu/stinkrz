import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useFavorites } from "@/hooks/useFavorites";

export default function Viewers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isFavorited, hasFavoritedMe, toggleFavorite } = useFavorites(user?.email);

  const { data: views = [], isLoading } = useQuery({
    queryKey: ["profile-views", user?.email],
    queryFn: () => base44.entities.ProfileView.filter({ viewed_email: user.email }),
    enabled: !!user?.email,
    staleTime: 60_000,
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

  // Deduplicate — keep most recent view per viewer
  const uniqueViews = useMemo(() => {
    const seen = {};
    [...views].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .forEach(v => { if (!seen[v.viewer_email]) seen[v.viewer_email] = v; });
    return Object.values(seen);
  }, [views]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Eye className="w-5 h-5 text-primary" />
        <h1 className="font-heading text-2xl font-bold">Who Viewed Me</h1>
        <span className="ml-auto font-body text-sm text-muted-foreground">{uniqueViews.length} total</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : uniqueViews.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">👀</p>
          <p className="font-body text-sm">No profile views yet. Get on the map!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {uniqueViews.map((view) => {
            const profile = profileMap[view.viewer_email];
            const isMatch = isFavorited(view.viewer_email) && hasFavoritedMe(view.viewer_email);
            return (
              <div key={view.viewer_email}
                className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center border-2"
                  style={{ borderColor: isMatch ? "#f87171" : "transparent" }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xl">🤙</span>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-body font-semibold text-sm truncate">
                      {profile?.display_name || view.viewer_email}
                    </p>
                    {isMatch && (
                      <span className="text-[10px] font-body font-semibold text-red-400 bg-red-400/10 border border-red-400/25 rounded-full px-2 py-0.5 shrink-0">
                        💞 Match
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs text-muted-foreground">
                    {profile?.scent_category && `${profile.scent_category} · `}
                    {formatDistanceToNow(new Date(view.created_date), { addSuffix: true })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleFavorite(view.viewer_email)}
                    className="text-lg transition-transform hover:scale-110"
                    title={isFavorited(view.viewer_email) ? "Unfavorite" : "Favorite back"}
                  >
                    {isFavorited(view.viewer_email) ? "❤️" : "🤍"}
                  </button>
                  <Button size="sm" variant="outline"
                    className="font-body text-xs px-3 h-8 gap-1"
                    onClick={() => navigate("/messages", { state: { openConversationWith: profile || { user_email: view.viewer_email, display_name: view.viewer_email } } })}>
                    <MessageCircle className="w-3 h-3" />
                    Chat
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}