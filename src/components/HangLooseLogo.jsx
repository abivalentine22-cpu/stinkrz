import React from "react";

export default function HangLooseLogo({ size = 40, className = "" }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <img
        src="https://media.base44.com/images/public/69faa8a3ff7324c96aef6556/3e04d811d_logo2.png"
        alt="Stinkrz"
        style={{ height: size, width: size, objectFit: "contain", objectPosition: "center" }}
      />
    </div>
  );
}