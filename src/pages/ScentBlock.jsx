import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";
import "leaflet/dist/leaflet.css";
import ProfileModal from "@/components/scent/ProfileModal";
import FilterChips from "@/components/scent/FilterChips";
import MapPin from "@/components/scent/MapPin";
import { DEMO_PROFILES } from "@/lib/demoData";
import { useNavigate } from "react-router-dom";
import { Crosshair, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

// "You" marker location — center of the demo map
const YOU_LOCATION = { location_lat: 40.7128, location_lng: -74.006 };
const YOU_PROFILE = { display_name: "You", is_online: true, scent_category: "Neutral", avatar_url: null };

function createLeafletIcon(profile, isYou = false) {
  const SCENT_RING = {
    Fresh: "#34d399", Musky: "#fbbf24", Ripe: "#f87171", Earthy: "#fb923c", Neutral: "#94a3b8",
  };
  const ringColor = isYou ? "#a78bfa" : (SCENT_RING[profile.scent_category] || "#94a3b8");
  const label = isYou ? "🫵 You" : profile.display_name;
  const initial = profile.display_name?.[0]?.toUpperCase() || "?";

  const html = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
      ${profile.is_online && !isYou ? `<span style="position:absolute;top:0;left:0;right:0;bottom:0;border-radius:50%;background:${ringColor};opacity:0.3;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;width:48px;height:48px;"></span>` : ""}
      <div style="
        width:48px;height:48px;border-radius:50%;overflow:hidden;
        border:3px solid ${ringColor};
        background:#1e1b3a;
        box-shadow:0 0 14px ${ringColor}55;
        display:flex;align-items:center;justify-content:center;
        font-size:20px;font-weight:bold;color:#e2e8f0;
        transition:transform 0.15s;
      ">
        ${profile.avatar_url
          ? `<img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;" />`
          : `<span>${isYou ? "🤙" : initial}</span>`
        }
      </div>
      ${profile.is_online ? `<span style="position:absolute;bottom:0;right:0;width:13px;height:13px;border-radius:50%;background:#4ade80;border:2px solid #0f0c23;"></span>` : ""}
      <div style="
        margin-top:5px;white-space:nowrap;font-size:11px;font-weight:600;
        padding:2px 8px;border-radius:9999px;
        background:${isYou ? "rgba(167,139,250,0.2)" : "rgba(15,12,35,0.85)"};
        color:${isYou ? "#a78bfa" : "#e2e8f0"};
        border:1px solid ${isYou ? "#a78bfa55" : "rgba(255,255,255,0.1)"};
      ">${label}</div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [80, 72],
    iconAnchor: [40, 24],
    popupAnchor: [0, -30],
  });
}

function RecenterButton() {
  const map = useMap();
  return (
    <button
      onClick={() => map.flyTo([YOU_LOCATION.location_lat, YOU_LOCATION.location_lng], 14, { animate: true, duration: 1 })}
      className="absolute bottom-24 right-4 z-[1000] w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
      title="Re-center on you"
    >
      <Crosshair className="w-4 h-4 text-primary" />
    </button>
  );
}

export default function ScentBlock() {
  const [filter, setFilter] = useState("All");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const navigate = useNavigate();

  const filtered = DEMO_PROFILES.filter(
    (p) => filter === "All" || p.scent_category === filter
  );

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 64px)" }}>
      {/* Filter chips — floating over the map */}
      <div className="absolute top-4 left-0 right-0 z-[1000] px-4 pointer-events-none">
        <div className="pointer-events-auto max-w-xl mx-auto">
          <FilterChips active={filter} onChange={setFilter} />
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={[YOU_LOCATION.location_lat, YOU_LOCATION.location_lng]}
        zoom={14}
        zoomControl={false}
        className="w-full h-full"
        style={{ background: "#0f0c23" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* "You" marker */}
        <Marker
          position={[YOU_LOCATION.location_lat, YOU_LOCATION.location_lng]}
          icon={createLeafletIcon({ ...YOU_PROFILE, display_name: "You" }, true)}
        />

        {/* Profile markers */}
        {filtered.map((profile) => (
          <Marker
            key={profile.id}
            position={[profile.location_lat, profile.location_lng]}
            icon={createLeafletIcon(profile)}
            eventHandlers={{ click: () => setSelectedProfile(profile) }}
          />
        ))}

        <RecenterButton />
      </MapContainer>

      {/* Profile count badge */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-card/90 backdrop-blur border border-border rounded-full px-3 py-1.5 text-xs font-body text-muted-foreground flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5 text-primary" />
        {filtered.length} nearby
      </div>

      {/* Profile modal */}
      <ProfileModal
        profile={selectedProfile}
        open={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onMessage={() => {
          setSelectedProfile(null);
          navigate("/messages");
        }}
      />
    </div>
  );
}