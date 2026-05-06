import React from "react";

export default function HangLooseLogo({ size = 40, className = "" }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src="https://media.base44.com/images/public/69faa8a3ff7324c96aef6556/3e04d811d_logo2.png"
        alt="Stinkrz"
        style={{ height: size, width: "auto", objectFit: "contain" }}
      />
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 800,
          fontSize: size * 0.6,
          letterSpacing: "0.06em",
          background: "linear-gradient(90deg, #2dd4bf, #38bdf8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        STINKRZ
      </span>
    </div>
  );
}