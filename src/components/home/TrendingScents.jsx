import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp } from "lucide-react";

const SCENT_COLORS = {
  Fresh: "#34d399", Musky: "#fbbf24", Ripe: "#f87171",
  Earthy: "#fb923c", Neutral: "#94a3b8",
};

const SCENT_EMOJIS = {
  Fresh: "🧼", Musky: "🌲", Ripe: "🧀", Earthy: "🍂", Neutral: "⚖️",
};

export default function TrendingScents() {
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    const TIMEOUT = 60; // minutes — "active today"
    base44.entities.ScentProfile.list().then(profiles => {
      const active = profiles.filter(p => {
        if (!p.last_active) return false;
        return (new Date() - new Date(p.last_active)) / 60000 < TIMEOUT;
      });
      const counts = {};
      active.forEach(p => {
        const cat = p.scent_category || "Neutral";
        counts[cat] = (counts[cat] || 0) + 1;
      });
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, count]) => ({ cat, count }));
      setTrending(sorted);
    });
  }, []);

  if (trending.length === 0) return null;

  const max = trending[0]?.count || 1;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-sm">Trending Scents Today</h3>
      </div>
      <div className="space-y-2.5">
        {trending.map(({ cat, count }) => (
          <div key={cat} className="flex items-center gap-3">
            <span className="text-base">{SCENT_EMOJIS[cat]}</span>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-body text-xs font-medium" style={{ color: SCENT_COLORS[cat] }}>{cat}</span>
                <span className="font-body text-xs text-muted-foreground">{count}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(count / max) * 100}%`, background: SCENT_COLORS[cat] }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}