import React from "react";

export default function HangLooseLogo({ size = 40, className = "" }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span style={{ fontSize: size }} className="select-none" role="img" aria-label="stinkrz">👍</span>
      <span className="font-heading font-bold text-primary tracking-tight" style={{ fontSize: size * 0.6 }}>
        Stinkrz
      </span>
    </div>
  );
}