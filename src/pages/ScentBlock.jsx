import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import ProfileDrawer from "@/components/scent/ProfileDrawer";
import FilterChips from "@/components/scent/FilterChips";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Crosshair, Eye, Navigation, NavigationOff, Wifi } from "lucide-react";
import { useScentMatchNotifications } from "@/hooks/useScentMatchNotifications";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useAuth } from "@/lib/AuthContext";

const ACTIVITY_TIMEOUT_MINS = 15;

const SCENT_RING = {
  Fresh: "#34d399",
  Musky: "#fbbf24",
  Ripe: "#f87171",
  Earthy: "#fb923c",
  Neutral: "#94a3b8",
};

// Stable helper — defined outside component
function processProfile(p) {
  if (!p.location_lat || !p.location_lng) return null;
  if (p.invisible_mode) return null;
  if (p.last_active) {
    const minsSince = (new Date() - new Date(p.last_active)) / (1000 * 60);
    if (minsSince > ACTIVITY_TIMEOUT_MINS) return null;
  }
  if (p.fuzzy_location) {
    const fuzz = 0.005;
    return {
      ...p,
      location_lat: p.location_lat + (Math.random() - 0.5) * fuzz * 2,
      location_lng: p.location_lng + (Math.random() - 0.5) * fuzz * 2,
    };
  }
  return p;
}

function calcDistance(lat, lng, youLat, youLng) {
  const R = 3958.8;
  const dLat = ((lat - youLat) * Math.PI) / 180;
  const dLng = ((lng - youLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((youLat * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

function createPinEl(profile, isYou = false) {
  const ringColor = isYou ? "#a78bfa" : (SCENT_RING[profile.scent_category] || "#94a3b8");
  const label = isYou ? "🫵 You" : profile.display_name;
  const initial = profile.display_name?.[0]?.toUpperCase() || "?";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;cursor:pointer;";

  const avatarWrap = document.createElement("div");
  avatarWrap.style.cssText = `position:relative;`;

  if (isYou) {
    const pulse = document.createElement("div");
    pulse.style.cssText = `position:absolute;inset:-6px;border-radius:50%;border:2px solid ${ringColor};opacity:0.5;animation:mapPing 1.8s cubic-bezier(0,0,0.2,1) infinite;`;
    avatarWrap.appendChild(pulse);
  }

  const circle = document.createElement("div");
  circle.style.cssText = `
    width:48px;height:48px;border-radius:50%;overflow:hidden;
    border:3px solid ${ringColor};
    background:#1e1b3a;
    box-shadow:0 0 16px ${ringColor}66;
    display:flex;align-items:center;justify-content:center;
    font-weight:bold;color:#e2e8f0;position:relative;
    transition: transform 0.15s ease;
  `;

  if (profile.avatar_url) {
    const img = document.createElement("img");
    img.src = profile.avatar_url;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;";
    img.loading = "lazy";
    circle.appendChild(img);
  } else {
    circle.innerHTML = `<span style="font-size:18px;">${isYou ? "🤙" : initial}</span>`;
  }

  if (profile.is_online && !isYou) {
    const dot = document.createElement("span");
    dot.style.cssText = "position:absolute;bottom:0;right:0;width:12px;height:12px;border-radius:50%;background:#4ade80;border:2px solid #0f0c23;";
    circle.appendChild(dot);
  }

  avatarWrap.appendChild(circle);

  const nameTag = document.createElement("div");
  nameTag.style.cssText = `
    margin-top:4px;white-space:nowrap;font-size:11px;font-weight:600;
    padding:2px 8px;border-radius:9999px;
    background:${isYou ? "rgba(167,139,250,0.25)" : "rgba(15,12,35,0.88)"};
    color:${isYou ? "#a78bfa" : "#e2e8f0"};
    border:1px solid ${isYou ? "#a78bfa55" : "rgba(255,255,255,0.12)"};
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
    font-family:sans-serif;
    pointer-events:none;
  `;
  nameTag.textContent = label;

  wrapper.appendChild(avatarWrap);
  wrapper.appendChild(nameTag);

  // Hover scale effect
  wrapper.addEventListener("mouseenter", () => { circle.style.transform = "scale(1.12)"; });
  wrapper.addEventListener("mouseleave", () => { circle.style.transform = "scale(1)"; });

  return wrapper;
}

export default function ScentBlock() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("All");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({}); // id -> maplibregl.Marker
  const youMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const navigate = useNavigate();

  useScentMatchNotifications(userPos, myProfile);
  const { isBlocked } = useBlockedUsers();

  // Inject ping keyframes once
  useEffect(() => {
    const id = "mapPingStyle";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `@keyframes mapPing { 75%,100%{transform:scale(2);opacity:0;} }`;
      document.head.appendChild(style);
    }
  }, []);

  // Init MapLibre map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "carto-dark": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap © CARTO",
          },
        },
        layers: [{ id: "carto-dark-layer", type: "raster", source: "carto-dark" }],
      },
      center: [-122.675, 45.505],
      zoom: 13,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Load profiles + subscribe
  useEffect(() => {
    if (!user?.email) return;

    async function initialLoad() {
      const all = await base44.entities.ScentProfile.list();
      const mine = all.find(p => p.user_email === user.email);
      setMyProfile(mine || null);
      if (mine?.location_lat && mine?.location_lng) {
        setUserPos({ lat: mine.location_lat, lng: mine.location_lng });
      }
      setProfiles(
        all.filter(p => p.user_email !== user.email).map(processProfile).filter(Boolean)
      );
      setLoading(false);
    }
    initialLoad();

    const unsub = base44.entities.ScentProfile.subscribe((event) => {
      if (event.data?.user_email === user.email) {
        if (event.type === "update") setMyProfile(event.data);
        return;
      }
      if (event.type === "create" || event.type === "update") {
        const processed = processProfile(event.data);
        setProfiles(prev => {
          const without = prev.filter(p => p.id !== event.id);
          return processed ? [...without, processed] : without;
        });
      } else if (event.type === "delete") {
        setProfiles(prev => prev.filter(p => p.id !== event.id));
      }
    });

    const interval = setInterval(async () => {
      const all = await base44.entities.ScentProfile.list();
      setProfiles(
        all.filter(p => p.user_email !== user.email).map(processProfile).filter(Boolean)
      );
    }, 30000);

    return () => { unsub(); clearInterval(interval); };
  }, [user?.email]);

  const saveLocation = useCallback(async (lat, lng, profileOverride) => {
    const profile = profileOverride || myProfile;
    if (!profile) return;
    await base44.entities.ScentProfile.update(profile.id, {
      location_lat: lat,
      location_lng: lng,
      is_online: true,
      last_active: new Date().toISOString(),
    });
  }, [myProfile]);

  useEffect(() => {
    if (myProfile && userPos) saveLocation(userPos.lat, userPos.lng, myProfile);
  }, [myProfile?.id]);

  useEffect(() => {
    if (!myProfile) return;
    const heartbeat = setInterval(() => {
      base44.entities.ScentProfile.update(myProfile.id, {
        is_online: true,
        last_active: new Date().toISOString(),
      });
    }, 30 * 1000);
    return () => clearInterval(heartbeat);
  }, [myProfile?.id]);

  // Geolocation
  useEffect(() => {
    const saved = localStorage.getItem("stinkrz_last_pos");
    if (saved) {
      try { setUserPos(JSON.parse(saved)); } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setUserPos({ lat, lng });
          localStorage.setItem("stinkrz_last_pos", JSON.stringify({ lat, lng }));
          saveLocation(lat, lng);
          if (mapRef.current) {
            mapRef.current.flyTo({ center: [lng, lat], zoom: 14, duration: 1200 });
          }
        },
        () => {}
      );
    }
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [myProfile]);

  const startTracking = () => {
    if (!navigator.geolocation) { setGeoError("Geolocation not supported"); return; }
    setGeoError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        saveLocation(lat, lng);
        if (mapRef.current && tracking) {
          mapRef.current.easeTo({ center: [lng, lat], duration: 800 });
        }
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

  const toggleTracking = () => tracking ? stopTracking() : startTracking();

  // Filtered profiles
  const youPos = userPos || { lat: 45.5051, lng: -122.6750 };

  const filtered = useMemo(() => {
    return profiles
      .filter((p) => {
        if (filter !== "All" && p.scent_category !== filter) return false;
        if (isBlocked(p.user_email)) return false;
        if (p.invisible_mode) return false;
        return true;
      })
      .map((p) => ({
        ...p,
        distance: calcDistance(p.location_lat, p.location_lng, youPos.lat, youPos.lng),
      }));
  }, [profiles, filter, isBlocked, youPos.lat, youPos.lng]);

  const onlineCount = useMemo(() => filtered.filter(p => p.is_online).length, [filtered]);

  // Sync "You" marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

    const el = createPinEl(
      { display_name: "You", is_online: true, scent_category: "Neutral", avatar_url: myProfile?.avatar_url },
      true
    );

    if (youMarkerRef.current) {
      youMarkerRef.current.setLngLat([youPos.lng, youPos.lat]);
      youMarkerRef.current.getElement().replaceWith(el);
      // Swap element reference
      youMarkerRef.current.remove();
    }

    const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([youPos.lng, youPos.lat])
      .addTo(map);
    youMarkerRef.current = marker;
  }, [youPos.lat, youPos.lng, myProfile?.avatar_url]);

  // Sync profile markers — add new, remove stale
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(filtered.map(p => p.id));

    // Remove markers no longer in filtered
    for (const [id, marker] of Object.entries(markersRef.current)) {
      if (!currentIds.has(id)) {
        marker.remove();
        delete markersRef.current[id];
      }
    }

    // Add or update markers
    filtered.forEach((profile) => {
      if (markersRef.current[profile.id]) {
        // Update position silently
        markersRef.current[profile.id].setLngLat([profile.location_lng, profile.location_lat]);
        return;
      }

      const el = createPinEl(profile);
      el.addEventListener("click", () => setSelectedProfile(profile));

      // Entrance animation
      el.style.opacity = "0";
      el.style.transform = "scale(0.5)";
      el.style.transition = "opacity 0.3s ease, transform 0.3s ease";

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([profile.location_lng, profile.location_lat])
        .addTo(map);

      markersRef.current[profile.id] = marker;

      // Trigger entrance animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = "1";
          el.style.transform = "scale(1)";
        });
      });
    });
  }, [filtered]);

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 64px)" }}>
      {/* MapLibre CSS overrides */}
      <style>{`
        .maplibregl-ctrl-bottom-right { bottom: 80px !important; }
        .maplibregl-ctrl-group { background: rgba(30,27,58,0.95) !important; border: 1px solid rgba(255,255,255,0.12) !important; }
        .maplibregl-ctrl-group button { background: transparent !important; }
        .maplibregl-ctrl-group button svg path { fill: #a78bfa !important; }
      `}</style>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2000,
          background: "rgba(15,12,35,0.85)", backdropFilter: "blur(6px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px",
        }}>
          <span style={{ fontSize: "40px" }}>🗺️</span>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "3px solid rgba(167,139,250,0.2)", borderTopColor: "#a78bfa", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "#94a3b8", fontSize: "13px", fontFamily: "var(--font-body)" }}>Finding nearby scents…</p>
        </div>
      )}

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

      {/* Map container */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Recenter button */}
      <button
        onClick={() => {
          if (mapRef.current) {
            mapRef.current.flyTo({ center: [youPos.lng, youPos.lat], zoom: 14, duration: 1000 });
          }
        }}
        style={{
          position: "absolute", bottom: "80px", right: "16px", zIndex: 1000,
          width: "40px", height: "40px", borderRadius: "50%",
          background: "rgba(30,27,58,0.95)", border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#a78bfa",
        }}
        title="Re-center"
      >
        <Crosshair size={16} />
      </button>

      {/* Bottom bar */}
      <div style={{
        position: "absolute", bottom: "16px", left: "16px", right: "64px",
        zIndex: 1000, display: "flex", alignItems: "center", gap: "8px",
        pointerEvents: "none",
      }}>
        <div style={{
          background: "rgba(30,27,58,0.92)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "9999px", padding: "6px 14px",
          fontSize: "12px", color: "#94a3b8",
          display: "flex", alignItems: "center", gap: "6px",
          backdropFilter: "blur(8px)", pointerEvents: "auto",
        }}>
          <Eye size={14} color="#a78bfa" />
          {filtered.length} nearby
          {onlineCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: "3px", color: "#4ade80", marginLeft: "4px" }}>
              <Wifi size={11} /> {onlineCount} live
            </span>
          )}
        </div>

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
        >
          {tracking ? <Navigation size={14} /> : <NavigationOff size={14} />}
          {tracking ? "Tracking live" : "Track me"}
        </button>

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