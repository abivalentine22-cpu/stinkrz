import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import ProfileDrawer from "@/components/scent/ProfileDrawer";
import FilterChips from "@/components/scent/FilterChips";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Crosshair, Eye, Navigation, NavigationOff } from "lucide-react";
import { useScentMatchNotifications } from "@/hooks/useScentMatchNotifications";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";

// Fix Leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ACTIVITY_TIMEOUT_MINS = 15; // Mark offline after 15 minutes of inactivity

const SCENT_RING = {
  Fresh: "#34d399",
  Musky: "#fbbf24",
  Ripe: "#f87171",
  Earthy: "#fb923c",
  Neutral: "#94a3b8",
};

function createPinIcon(profile, isYou = false) {
  const ringColor = isYou ? "#a78bfa" : (SCENT_RING[profile.scent_category] || "#94a3b8");
  const label = isYou ? "🫵 You" : profile.display_name;
  const initial = profile.display_name?.[0]?.toUpperCase() || "?";
  const avatarHtml = profile.avatar_url
    ? `<img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<span style="font-size:18px;">${isYou ? "🤙" : initial}</span>`;

  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;position:relative;">
      <div style="
        width:48px;height:48px;border-radius:50%;overflow:hidden;
        border:3px solid ${ringColor};
        background:#1e1b3a;
        box-shadow:0 0 16px ${ringColor}66;
        display:flex;align-items:center;justify-content:center;
        font-weight:bold;color:#e2e8f0;position:relative;
      ">
        ${avatarHtml}
        ${profile.is_online ? `<span style="position:absolute;bottom:0;right:0;width:12px;height:12px;border-radius:50%;background:#4ade80;border:2px solid #0f0c23;"></span>` : ""}
      </div>
      <div style="
        margin-top:4px;white-space:nowrap;font-size:11px;font-weight:600;
        padding:2px 8px;border-radius:9999px;
        background:${isYou ? "rgba(167,139,250,0.25)" : "rgba(15,12,35,0.88)"};
        color:${isYou ? "#a78bfa" : "#e2e8f0"};
        border:1px solid ${isYou ? "#a78bfa55" : "rgba(255,255,255,0.12)"};
        box-shadow:0 2px 8px rgba(0,0,0,0.4);
        font-family:sans-serif;
      ">${label}</div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [80, 80],
    iconAnchor: [40, 24],
  });
}

function MapController({ userPos, tracking }) {
  const map = useMap();
  const prevTracking = useRef(false);

  useEffect(() => {
    if (tracking && userPos) {
      map.flyTo([userPos.lat, userPos.lng], 14, { animate: true, duration: 1 });
    }
    prevTracking.current = tracking;
  }, [userPos, tracking]);

  return null;
}

function RecenterControl({ userPos, onRecenter }) {
  const map = useMap();
  return (
    <button
      onClick={() => {
         const pos = userPos || { lat: 40.7128, lng: -74.006 };
         map.flyTo([pos.lat, pos.lng], 14, { animate: true, duration: 1 });
        onRecenter?.();
      }}
      style={{
        position: "absolute",
        bottom: "80px",
        right: "16px",
        zIndex: 1000,
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        background: "rgba(30,27,58,0.95)",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#a78bfa",
      }}
      title="Re-center"
    >
      <Crosshair size={16} />
    </button>
  );
}

export default function ScentBlock() {
  const [filter, setFilter] = useState("All");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const watchIdRef = useRef(null);
  const locationSaveRef = useRef(null);
  const navigate = useNavigate();

  // Real-time scent match push notifications
  useScentMatchNotifications(userPos, myProfile);
  const { isBlocked } = useBlockedUsers();

  // Load current user + all profiles
  useEffect(() => {
    async function loadData() {
      const user = await base44.auth.me();
      const all = await base44.entities.ScentProfile.list();
      const mine = all.find(p => p.user_email === user.email);
      setMyProfile(mine || null);
      
      // Set default location to user's last known location
      if (mine?.location_lat && mine?.location_lng) {
        setUserPos({ lat: mine.location_lat, lng: mine.location_lng });
      }
      
      // Show everyone except yourself, filter out inactive users, apply fuzzy location if enabled
      setProfiles(
        all
          .filter(p => {
            if (p.user_email === user.email) return false;
            if (!p.location_lat || !p.location_lng) return false;
            // Check if user is still active (within timeout window)
            if (p.last_active) {
              const lastActive = new Date(p.last_active);
              const now = new Date();
              const minsSince = (now - lastActive) / (1000 * 60);
              if (minsSince > ACTIVITY_TIMEOUT_MINS) return false;
            }
            return true;
          })
          .map(p => {
            if (p.fuzzy_location) {
              const fuzz = 0.005;
              return {
                ...p,
                location_lat: p.location_lat + (Math.random() - 0.5) * fuzz * 2,
                location_lng: p.location_lng + (Math.random() - 0.5) * fuzz * 2,
              };
            }
            return p;
          })
      );
    }
    loadData();
  }, []);

  // Save current user's location to their profile so others can see them
  const saveLocation = async (lat, lng) => {
    if (!myProfile) return;
    await base44.entities.ScentProfile.update(myProfile.id, {
      location_lat: lat,
      location_lng: lng,
      is_online: true,
      last_active: new Date().toISOString(),
    });
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }
    setGeoError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        saveLocation(lat, lng);
      },
      () => setGeoError("Location access denied"),
      { enableHighAccuracy: true }
    );
    setTracking(true);
  };

  const stopTracking = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  };

  // Restore last known position from localStorage immediately
  useEffect(() => {
    const saved = localStorage.getItem("stinkrz_last_pos");
    if (saved) {
      try { setUserPos(JSON.parse(saved)); } catch (_) {}
    }
  }, []);

  // Get position once on mount & save it
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setUserPos({ lat, lng });
          localStorage.setItem("stinkrz_last_pos", JSON.stringify({ lat, lng }));
          saveLocation(lat, lng);
        },
        () => {}
      );
    }
    return () => stopTracking();
  }, [myProfile]); // re-run once myProfile is loaded so saveLocation works

  const toggleTracking = () => tracking ? stopTracking() : startTracking();

  const mapCenter = userPos ? [userPos.lat, userPos.lng] : [40.7128, -74.006];
  const youPos = userPos || { lat: 40.7128, lng: -74.006 };

  // Calculate distance in miles from user position
  const calcDistance = (lat, lng) => {
    const R = 3958.8;
    const dLat = ((lat - youPos.lat) * Math.PI) / 180;
    const dLng = ((lng - youPos.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((youPos.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  };

  const filtered = profiles
    .filter((p) => (filter === "All" || p.scent_category === filter) && !isBlocked(p.user_email))
    .map((p) => ({ ...p, distance: calcDistance(p.location_lat, p.location_lng) }));

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 64px)" }}>
      {/* Floating filter chips */}
      <div style={{
        position: "absolute", top: "16px", left: 0, right: 0,
        zIndex: 1000, padding: "0 16px", pointerEvents: "none",
        display: "flex", justifyContent: "center",
      }}>
        <div style={{ pointerEvents: "auto" }}>
          <FilterChips active={filter} onChange={setFilter} />
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={14}
        zoomControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          subdomains={['a','b','c']}
          crossOrigin="anonymous"
        />

        <MapController userPos={userPos} tracking={tracking} />

        {/* You marker */}
        <Marker
          position={[youPos.lat, youPos.lng]}
          icon={createPinIcon({ display_name: "You", is_online: true, scent_category: "Neutral", avatar_url: myProfile?.avatar_url }, true)}
        />

        {/* Profile markers */}
        {filtered.map((profile) => (
          <Marker
            key={profile.id}
            position={[profile.location_lat, profile.location_lng]}
            icon={createPinIcon(profile)}
            eventHandlers={{ click: () => setSelectedProfile(profile) }}
          />
        ))}

        <RecenterControl userPos={userPos} onRecenter={() => {}} />
      </MapContainer>

      {/* Bottom bar */}
      <div style={{
        position: "absolute", bottom: "16px", left: "16px", right: "16px",
        zIndex: 1000, display: "flex", alignItems: "center", gap: "8px",
        pointerEvents: "none",
      }}>
        {/* Nearby count */}
        <div style={{
          background: "rgba(30,27,58,0.92)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "9999px", padding: "6px 14px",
          fontSize: "12px", color: "#94a3b8",
          display: "flex", alignItems: "center", gap: "6px",
          backdropFilter: "blur(8px)", pointerEvents: "auto",
        }}>
          <Eye size={14} color="#a78bfa" />
          {filtered.length} nearby
        </div>

        {/* Live tracking toggle */}
        <button
          onClick={toggleTracking}
          style={{
            background: tracking ? "rgba(167,139,250,0.2)" : "rgba(30,27,58,0.92)",
            border: `1px solid ${tracking ? "#a78bfa" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "9999px", padding: "6px 14px",
            fontSize: "12px", color: tracking ? "#a78bfa" : "#94a3b8",
            display: "flex", alignItems: "center", gap: "6px",
            backdropFilter: "blur(8px)", cursor: "pointer", pointerEvents: "auto",
          }}
          title={tracking ? "Stop live tracking" : "Start live tracking"}
        >
          {tracking ? <Navigation size={14} /> : <NavigationOff size={14} />}
          {tracking ? "Tracking live" : "Track me"}
        </button>

        {/* Geo error */}
        {geoError && (
          <div style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "9999px", padding: "6px 14px",
            fontSize: "12px", color: "#f87171",
            backdropFilter: "blur(8px)", pointerEvents: "auto",
          }}>
            {geoError}
          </div>
        )}
      </div>

      {/* Profile drawer */}
      <ProfileDrawer
        profile={selectedProfile}
        open={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onMessage={(profile) => {
          setSelectedProfile(null);
          navigate("/messages", { state: { openConversationWith: profile } });
        }}
      />
    </div>
  );
}