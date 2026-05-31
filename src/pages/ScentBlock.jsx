import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import ProfileDrawer from "@/components/scent/ProfileDrawer";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { Crosshair, Eye, Home, MessageCircle, User } from "lucide-react";
import MapFilterPanel from "@/components/map/MapFilterPanel";
import { Link } from "react-router-dom";
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
  wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;cursor:pointer;will-change:transform;";

  const avatarWrap = document.createElement("div");
  avatarWrap.style.cssText = "position:relative;";

  if (isYou) {
    const pulse = document.createElement("div");
    pulse.style.cssText = `position:absolute;inset:-6px;border-radius:50%;border:2px solid ${ringColor};opacity:0.5;animation:mapPing 1.8s cubic-bezier(0,0,0.2,1) infinite;`;
    avatarWrap.appendChild(pulse);
  }

  const circle = document.createElement("div");
  circle.style.cssText = `width:44px;height:44px;border-radius:50%;overflow:hidden;border:3px solid ${ringColor};background:#1e1b3a;box-shadow:0 0 14px ${ringColor}55;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#e2e8f0;position:relative;transition:transform 0.15s ease;`;

  if (profile.avatar_url) {
    const img = document.createElement("img");
    img.src = profile.avatar_url;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;";
    img.loading = "lazy";
    img.decoding = "async";
    circle.appendChild(img);
  } else {
    circle.innerHTML = `<span style="font-size:16px;">${isYou ? "🤙" : initial}</span>`;
  }

  if (profile.is_online && !isYou) {
    const dot = document.createElement("span");
    dot.style.cssText = "position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:#4ade80;border:2px solid #0f0c23;";
    circle.appendChild(dot);
  }

  avatarWrap.appendChild(circle);

  const nameTag = document.createElement("div");
  nameTag.style.cssText = `margin-top:3px;white-space:nowrap;font-size:10px;font-weight:600;padding:2px 7px;border-radius:9999px;background:${isYou ? "rgba(167,139,250,0.25)" : "rgba(15,12,35,0.88)"};color:${isYou ? "#a78bfa" : "#e2e8f0"};border:1px solid ${isYou ? "#a78bfa55" : "rgba(255,255,255,0.1)"};box-shadow:0 2px 6px rgba(0,0,0,0.4);font-family:sans-serif;pointer-events:none;`;
  nameTag.textContent = label;

  wrapper.appendChild(avatarWrap);
  wrapper.appendChild(nameTag);

  wrapper.addEventListener("mouseenter", () => { circle.style.transform = "scale(1.12)"; });
  wrapper.addEventListener("mouseleave", () => { circle.style.transform = "scale(1)"; });

  return wrapper;
}

export default function ScentBlock() {
  const { user } = useAuth();
  const [mapFilters, setMapFilters] = useState({ minAge: "", maxAge: "", maxDistance: "", showerFrequency: "Any", lookingFor: "Any", scentCategory: "All", gender: "Any", sexuality: "Any" });
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const youMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const myProfileRef = useRef(null); // stable ref to avoid stale closure in saveLocation
  const navigate = useNavigate();

  useScentMatchNotifications(userPos, myProfile);
  const { isBlocked } = useBlockedUsers();

  // Keep myProfileRef in sync
  useEffect(() => { myProfileRef.current = myProfile; }, [myProfile]);

  // Inject ping keyframes once
  useEffect(() => {
    const id = "mapPingStyle";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `@keyframes mapPing { 75%,100%{transform:scale(2);opacity:0;} } @keyframes spin { to{transform:rotate(360deg);} }`;
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
            maxzoom: 19,
          },
        },
        layers: [{ id: "carto-dark-layer", type: "raster", source: "carto-dark" }],
      },
      center: [-122.675, 45.505],
      zoom: 13,
      attributionControl: false,
      fadeDuration: 100, // faster tile fade-in
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    map.on("load", () => setMapReady(true));

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Load profiles + subscribe (real-time only, no redundant polling)
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

    // Lighter periodic refresh — only to catch missed events (every 60s, not 30s)
    const interval = setInterval(async () => {
      const all = await base44.entities.ScentProfile.list();
      setProfiles(
        all.filter(p => p.user_email !== user.email).map(processProfile).filter(Boolean)
      );
    }, 60000);

    return () => { unsub(); clearInterval(interval); };
  }, [user?.email]);

  // saveLocation uses ref — never re-creates, no stale closure
  const saveLocation = useCallback(async (lat, lng) => {
    const profile = myProfileRef.current;
    if (!profile) return;
    await base44.entities.ScentProfile.update(profile.id, {
      location_lat: lat,
      location_lng: lng,
      is_online: true,
      last_active: new Date().toISOString(),
    });
  }, []); // stable — no deps needed

  useEffect(() => {
    if (myProfile && userPos) saveLocation(userPos.lat, userPos.lng);
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
      try { setUserPos(JSON.parse(saved)); return; } catch (_) {}
    }
    // No saved position — try IP-based geolocation as a better default than hardcoded Portland
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(d => {
        if (d.latitude && d.longitude) {
          const pos = { lat: d.latitude, lng: d.longitude };
          setUserPos(pos);
          if (mapRef.current) {
            mapRef.current.setCenter([pos.lng, pos.lat]);
          }
        }
      })
      .catch(() => {}); // fail silently, GPS will override anyway
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
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
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []); // run once on mount — not on every myProfile change

  const startTracking = () => {
    if (!navigator.geolocation) { setGeoError("Geolocation not supported"); return; }
    setGeoError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        saveLocation(lat, lng);
        if (mapRef.current) {
          mapRef.current.easeTo({ center: [lng, lat], duration: 600 });
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

  const youPos = userPos || { lat: 45.5051, lng: -122.6750 };

  const filtered = useMemo(() => {
    return profiles
      .filter((p) => {
        if (mapFilters.scentCategory !== "All" && p.scent_category !== mapFilters.scentCategory) return false;
        if (isBlocked(p.user_email)) return false;
        if (p.invisible_mode) return false;
        if (mapFilters.minAge !== "" && (p.age || 0) < parseInt(mapFilters.minAge)) return false;
        if (mapFilters.maxAge !== "" && (p.age || 999) > parseInt(mapFilters.maxAge)) return false;
        if (mapFilters.showerFrequency !== "Any" && p.shower_frequency !== mapFilters.showerFrequency) return false;
        if (mapFilters.lookingFor !== "Any" && p.looking_for !== mapFilters.lookingFor) return false;
        if (mapFilters.gender !== "Any" && p.gender !== mapFilters.gender) return false;
        if (mapFilters.sexuality !== "Any" && p.sexuality !== mapFilters.sexuality) return false;
        return true;
      })
      .map((p) => ({
        ...p,
        distance: calcDistance(p.location_lat, p.location_lng, youPos.lat, youPos.lng),
      }))
      .filter(p => mapFilters.maxDistance === "" || parseFloat(p.distance) <= parseFloat(mapFilters.maxDistance));
  }, [profiles, mapFilters, isBlocked, youPos.lat, youPos.lng]);

  const onlineCount = useMemo(() => filtered.filter(p => p.is_online).length, [filtered]);

  // Sync "You" marker — only move if already exists, recreate only on avatar change
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    const lngLat = [youPos.lng, youPos.lat];

    if (youMarkerRef.current) {
      // Just move it — no DOM recreation needed
      youMarkerRef.current.setLngLat(lngLat);
      return;
    }

    // First creation
    const el = createPinEl(
      { display_name: "You", is_online: true, scent_category: "Neutral", avatar_url: myProfile?.avatar_url },
      true
    );
    if (myProfile) el.addEventListener("click", () => setSelectedProfile(myProfile));
    youMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat(lngLat)
      .addTo(map);
  }, [mapReady, youPos.lat, youPos.lng]);

  // Recreate "You" marker only when avatar actually changes
  useEffect(() => {
    if (!mapReady || !youMarkerRef.current) return;
    const map = mapRef.current;
    if (!map) return;
    const lngLat = [youPos.lng, youPos.lat];
    youMarkerRef.current.remove();
    youMarkerRef.current = null;
    const el = createPinEl(
      { display_name: "You", is_online: true, scent_category: "Neutral", avatar_url: myProfile?.avatar_url },
      true
    );
    if (myProfile) el.addEventListener("click", () => setSelectedProfile(myProfile));
    youMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat(lngLat)
      .addTo(map);
  }, [myProfile?.avatar_url]); // eslint-disable-line

  // Sync profile markers — show/hide for filter changes, add/remove for data changes
  useEffect(() => {
    if (!mapReady) return;
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

    filtered.forEach((profile) => {
      if (markersRef.current[profile.id]) {
        markersRef.current[profile.id].setLngLat([profile.location_lng, profile.location_lat]);
        return;
      }

      const el = createPinEl(profile);
      el.addEventListener("click", () => setSelectedProfile(profile));

      el.style.opacity = "0";
      el.style.transform = "scale(0.6)";
      el.style.transition = "opacity 0.25s ease, transform 0.25s ease";

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([profile.location_lng, profile.location_lat])
        .addTo(map);

      markersRef.current[profile.id] = marker;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = "1";
          el.style.transform = "scale(1)";
        });
      });
    });
  }, [mapReady, filtered]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <style>{`
        .maplibregl-ctrl-bottom-right { bottom: 16px !important; right: 16px !important; }
        .maplibregl-ctrl-group {
          background: rgba(20,17,40,0.85) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 50% !important;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
        }
        .maplibregl-ctrl-group button {
          background: transparent !important;
          width: 36px !important; height: 36px !important;
        }
        .maplibregl-ctrl-group button + button { border-top: 1px solid rgba(255,255,255,0.08) !important; }
        .maplibregl-ctrl-zoom-in span, .maplibregl-ctrl-zoom-out span { color: #c4b5fd !important; }
        .maplibregl-ctrl-compass { display: none !important; }
        .maplibregl-ctrl-attrib { display: none !important; }
      `}</style>

      {loading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2000,
          background: "rgba(10,8,25,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid rgba(167,139,250,0.2)", borderTopColor: "#a78bfa", animation: "spin 0.8s linear infinite" }} />
        </div>
      )}

      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Top nav bar */}
      <div style={{ position: "absolute", top: "14px", left: "14px", right: "14px", zIndex: 1000, display: "flex", alignItems: "center", gap: "8px" }}>
        {[
          { to: "/", icon: <Home size={14} />, title: "Home" },
          { to: "/messages", icon: <MessageCircle size={14} />, title: "Messages" },
          { to: "/profile", icon: <User size={14} />, title: "Profile" },
        ].map(({ to, icon, title }) => (
          <Link key={to} to={to} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "36px", height: "36px", borderRadius: "50%",
            background: "rgba(20,17,40,0.85)", border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)", color: "#c4b5fd", flexShrink: 0,
            textDecoration: "none",
          }} title={title}>
            {icon}
          </Link>
        ))}
        <MapFilterPanel filters={mapFilters} onChange={setMapFilters} />
      </div>

      <button
        onClick={() => mapRef.current?.flyTo({ center: [youPos.lng, youPos.lat], zoom: 14, duration: 1000 })}
        style={{
          position: "absolute", bottom: "62px", right: "16px", zIndex: 1000,
          width: "36px", height: "36px", borderRadius: "50%",
          background: "rgba(20,17,40,0.85)", border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#c4b5fd",
        }}
        title="Re-center"
      >
        <Crosshair size={14} />
      </button>

      <button
        onClick={toggleTracking}
        style={{
          position: "absolute", bottom: "20px", left: "14px", zIndex: 1000,
          background: "rgba(20,17,40,0.85)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "9999px", padding: "7px 14px",
          fontSize: "12px", color: tracking ? "#c4b5fd" : "#94a3b8",
          display: "flex", alignItems: "center", gap: "6px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          cursor: "pointer", fontFamily: "var(--font-body)",
        }}
      >
        <Eye size={13} color={tracking ? "#c4b5fd" : "#94a3b8"} />
        {filtered.length} nearby
        {onlineCount > 0 && (
          <span style={{ color: "#4ade80", display: "flex", alignItems: "center", gap: "3px" }}>
            · <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", display: "inline-block" }} /> {onlineCount}
          </span>
        )}
      </button>

      {/* Empty state for brand new users with no profile/location */}
      {!loading && myProfile && !myProfile.location_lat && !userPos && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 1000, background: "rgba(20,17,40,0.95)", border: "1px solid rgba(167,139,250,0.3)",
          borderRadius: "16px", padding: "24px", maxWidth: "280px", textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>📍</div>
          <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "16px", color: "#e2e8f0", marginBottom: "8px" }}>
            Let people find you
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#94a3b8", lineHeight: 1.5, marginBottom: "16px" }}>
            Allow location access so others can see you on the Scent Block — and you can see them.
          </p>
          <button
            onClick={startTracking}
            style={{
              background: "hsl(263 70% 58%)", color: "white", border: "none",
              borderRadius: "9999px", padding: "10px 20px", fontSize: "13px",
              fontFamily: "var(--font-body)", fontWeight: 600, cursor: "pointer",
            }}
          >
            Enable Location
          </button>
        </div>
      )}

      {geoError && (
        <div style={{
          position: "absolute", bottom: "60px", left: "14px", zIndex: 1000,
          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "9999px", padding: "5px 12px",
          fontSize: "11px", color: "#f87171", fontFamily: "var(--font-body)",
        }}>
          {geoError}
        </div>
      )}

      <ProfileDrawer
        profile={selectedProfile}
        open={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onMessage={(profile) => {
          setSelectedProfile(null);
          navigate("/messages", { state: { openConversationWith: profile } });
        }}
        onReport={(profile) => {
          navigate("/report", { state: { reportedName: profile.display_name, reportedEmail: profile.user_email } });
        }}
      />
    </div>
  );
}