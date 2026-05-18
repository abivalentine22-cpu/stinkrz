import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { useState } from "react";

function getCompleteness(profile) {
  if (!profile) return { pct: 0, missing: ["profile"] };
  const checks = [
    { field: "avatar_url", label: "profile photo" },
    { field: "bio", label: "bio" },
    { field: "age", label: "age" },
    { field: "scent_category", label: "scent type" },
    { field: "vibe_badges", label: "vibe badges", isArray: true },
    { field: "personality_prompts", label: "personality prompts", isArray: true },
  ];
  const missing = checks.filter(c => {
    const v = profile[c.field];
    if (c.isArray) return !v || v.length === 0;
    return !v;
  }).map(c => c.label);
  const pct = Math.round(((checks.length - missing.length) / checks.length) * 100);
  return { pct, missing };
}

export default function ProfileCompletenessBanner({ profile }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !profile) return null;

  const { pct, missing } = getCompleteness(profile);
  if (pct >= 100) return null;

  return (
    <div className="mx-4 mt-3 mb-0 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-center gap-3">
      <AlertCircle className="w-4 h-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-semibold text-primary">{pct}% profile complete</p>
        <p className="font-body text-xs text-muted-foreground truncate">
          Add {missing.slice(0, 2).join(", ")}{missing.length > 2 ? ` +${missing.length - 2} more` : ""} to attract better matches
        </p>
      </div>
      <Link to="/profile" className="shrink-0 text-xs font-body font-semibold text-primary hover:underline">
        Complete
      </Link>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-muted-foreground hover:text-foreground">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}