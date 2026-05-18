import React from "react";

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
    <div style={{ display: "flex", gap: "6px", flexWrap: "nowrap", overflowX: "auto" }}>
      {FILTERS.map((filter) => {
        const isActive = active === filter;
        return (
          <button
            key={filter}
            onClick={() => onChange(filter)}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "5px 12px", borderRadius: "9999px",
              fontSize: "12px", fontFamily: "var(--font-body)",
              whiteSpace: "nowrap", cursor: "pointer",
              background: isActive ? "rgba(124,58,237,0.85)" : "rgba(15,12,35,0.7)",
              color: isActive ? "#fff" : "#94a3b8",
              border: isActive ? "1px solid rgba(167,139,250,0.5)" : "1px solid rgba(255,255,255,0.1)",
              boxShadow: isActive ? "0 0 12px rgba(124,58,237,0.35)" : "none",
              transition: "all 0.15s ease",
              backdropFilter: "blur(8px)",
            }}
          >
            <span style={{ fontSize: "13px" }}>{FILTER_EMOJIS[filter]}</span>
            {filter}
          </button>
        );
      })}
    </div>
  );
}