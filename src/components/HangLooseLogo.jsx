import React from "react";

export default function HangLooseLogo({ size = 40, className = "" }) {
  const fontSize = Math.round(size * 0.36);
  const pad = Math.round(size * 0.18);
  const gap = Math.round(size * 0.055);

  return (
    <div
      className={`inline-flex items-center justify-center relative ${className}`}
      style={{
        background: "linear-gradient(135deg, #6b0022 0%, #9b0035 50%, #6b0022 100%)",
        borderRadius: Math.round(size * 0.13),
        padding: `${pad}px ${Math.round(pad * 1.8)}px`,
        boxShadow: "0 2px 18px rgba(0,0,0,0.5)",
      }}
    >
      {/* Outer teal border */}
      <div style={{
        position: "absolute",
        inset: gap,
        border: "1.5px solid #2dd4bf",
        borderRadius: Math.round(size * 0.09),
        pointerEvents: "none",
      }} />
      {/* Inner blue border */}
      <div style={{
        position: "absolute",
        inset: gap * 2.5,
        border: "1.5px solid #38bdf8",
        borderRadius: Math.round(size * 0.05),
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
        {"STINKRZ".split("").map((letter, i) => {
          const t = i / 6;
          const color = `hsl(${175 - t * 15}, ${85 - t * 10}%, ${55 + t * 5}%)`;
          return (
            <span
              key={i}
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 800,
                fontSize: fontSize,
                letterSpacing: "0.06em",
                color,
                textShadow: `0 0 10px ${color}88`,
              }}
            >
              {letter}
            </span>
          );
        })}
        <span style={{ fontSize: fontSize * 1.05, marginLeft: 4 }}>🤙</span>
      </div>
    </div>
  );
}