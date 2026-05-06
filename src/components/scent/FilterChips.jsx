import React from "react";
import { Button } from "@/components/ui/button";

const FILTERS = ["All", "Fresh", "Musky", "Ripe", "Earthy", "Neutral"];

const FILTER_EMOJIS = {
  All: "✨",
  Fresh: "🧼",
  Musky: "🌲",
  Ripe: "🧀",
  Earthy: "🍂",
  Neutral: "⚖️",
};

export default function FilterChips({ active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {FILTERS.map((filter) => (
        <Button
          key={filter}
          variant={active === filter ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(filter)}
          className={`shrink-0 gap-1.5 font-body rounded-full transition-all ${
            active === filter
              ? "shadow-md shadow-primary/20"
              : "border-border hover:border-primary/40"
          }`}
        >
          <span>{FILTER_EMOJIS[filter]}</span>
          {filter}
        </Button>
      ))}
    </div>
  );
}