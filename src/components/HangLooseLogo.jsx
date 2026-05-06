import React from "react";

export default function HangLooseLogo({ size = 40, className = "" }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <img
        src="https://media.base44.com/images/public/69faa8a3ff7324c96aef6556/20c9ebc1d_image34.jpg"
        alt="Stinkrz"
        style={{ height: size, width: "auto", maxWidth: size * 4, objectFit: "contain", objectPosition: "center", borderRadius: 4 }}
      />
    </div>
  );
}