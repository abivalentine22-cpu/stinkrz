import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";

export default function NearbyCounter() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    const TIMEOUT = 15; // minutes
    base44.entities.ScentProfile.list().then(profiles => {
      const online = profiles.filter(p => {
        if (!p.is_online || p.invisible_mode) return false;
        if (!p.last_active) return false;
        return (new Date() - new Date(p.last_active)) / 60000 < TIMEOUT;
      });
      setCount(online.length);
    });
  }, []);

  if (count === null) return null;

  return (
    <Link to="/scent-block" className="inline-flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
      <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
      <span><strong className="text-foreground">{count}</strong> {count === 1 ? "person" : "people"} active on the Scent Block right now</span>
    </Link>
  );
}