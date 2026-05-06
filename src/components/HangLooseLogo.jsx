import React from "react";

export default function HangLooseLogo({ size = 40, className = "" }) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src="https://media.base44.com/images/public/69faa8a3ff7324c96aef6556/ced780340_logo.jpg"
        alt="Stinkrz"
        style={{ height: size, width: "auto", objectFit: "contain" }}
      />
    </div>
  );
}