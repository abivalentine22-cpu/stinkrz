import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import ProfileDrawer from "@/components/scent/ProfileDrawer";
import { base44 } from "@/api/base44Client";
import { locationPatch } from "@/lib/location";
import { useNavigate } from "react-router-dom";
import { Crosshair, Eye, Home, MessageCircle, Minus, Plus, User } from "lucide-react";
import MapFilterPanel from "@/components/map/MapFilterPanel";
import { Link } from "react-router-dom";
import { useScentMatchNotifications } from "@/hooks/useScentMatchNotifications";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useAuth } from "@/lib/AuthContext";

import { visibleMapProfile, hasOwnerMapView } from "@/lib/mapVisibility";

const SCENT_RING = {
  Fresh: "#34d399",
  Musky: "#fbbf24",
  Ripe: "#f87171",
  Earthy: "#fb923c",
  Neutral: "#94a3b8",
};


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
    const text = document.createElement("span");
    text.style.fontSize = "16px";
    text.textContent = isYou ? "🤙" : initial;
    circle.appendChild(text);
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
  const [totalUsers, setTotalUsers] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [reportError, setReportError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [enableLocDismissed, setEnableLocDismissed] = useState(false);
  const [earlyHintDismissed, setEarlyHintDismissed] = useState(false);
  const [reportedEmails, setReportedEmails] = useState([]);

  const mapContainerRef = useRef(null);
  const mapMovedByUserRef = useRef(false);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const youMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const myProfileRef = useRef(null); // stable ref to avoid stale closure in saveLocation
  const navigate = useNavigate();

  useScentMatchNotifications(userPos, myProfile);
  const { isBlocked } = useBlockedUsers();

  // Load users I've reported so we can hide them from the map (consistent with Feed)
  useEffect(() => {
    if (!user?.email) return;
    base44.entities.Report.filter({ reporter_email: user.email }).then(reports => {
      setReportedEmails(reports.map(r => r.reported_user_email));
      setReportError(null);
    }).catch(() => setReportError("Reported profiles could not be checked. Please refresh."));
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    setTotalUsers(null);
    base44.functions.invoke("communityStats", {}).then(({ data }) => {
      if (!cancelled && Number.isInteger(data?.totalUsers)) setTotalUsers(data.totalUsers);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.email]);

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
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [-122.675, 45.505],
      zoom: 13,
      attributionControl: false,
      fadeDuration: 100, // faster tile fade-in
    });

    mapRef.current = map;

    map.on("load", () => setMapReady(true));
    map.on("dragstart", () => { mapMovedByUserRef.current = true; });
    map.on("movestart", (event) => {
      if (event.originalEvent) mapMovedByUserRef.current = true;
    });

    return () => {
      map.remove();
      markersRef.current = {};
      youMarkerRef.current = null;
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Load profiles + subscribe (real-time only, no redundant polling)
  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;

    async function initialLoad() {
      // Retry through transient rate-limit (429) errors so the user isn't
      // stuck on a blank map when the gateway is briefly overloaded.
      let failure = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const all = await base44.entities.ScentProfile.list();
          if (cancelled) return;
          const mine = all.find(p => p.user_email === user.email);
          setMyProfile(mine || null);
          if (Number.isFinite(mine?.location_lat) && Number.isFinite(mine?.location_lng)) {
            setUserPos({ lat: mine.location_lat, lng: mine.location_lng });
          }
          setProfiles(
            all.filter(p => p.user_email !== user.email).map(p => visibleMapProfile(p, user)).filter(Boolean)
          );
          setProfileError(null);
          return;
        } catch (error) {
          failure = error;
          const status = error?.response?.status || error?.status;
          if (status === 401 || status === 403 || status === 400) break;
          if (attempt < 2) await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
        }
      }
      if (!cancelled) {
        const status = failure?.response?.status || failure?.status;
        const detail = status === 401 ? "Your login expired. Please sign in again."
          : status === 429 ? "Too many requests. Wait a moment, then retry."
          : status ? `Request failed (HTTP ${status}). Please retry.`
          : "The request could not complete. Please check your connection and retry.";
        setProfileError(`Profiles could not be loaded. ${detail}`);
      }
    }

    initialLoad().finally(() => { if (!cancelled) setLoading(false); });

    const unsub = base44.entities.ScentProfile.subscribe((event) => {
      if (event.data?.user_email === user.email) {
        if (event.type === "create" || event.type === "update") {
          setMyProfile(event.data);
          if (Number.isFinite(event.data?.location_lat) && Number.isFinite(event.data?.location_lng)) {
            setUserPos({ lat: event.data.location_lat, lng: event.data.location_lng });
          }
        }
        return;
      }
      if (event.type === "create" || event.type === "update") {
        const processed = visibleMapProfile(event.data, user);
        setProfiles(prev => {
          const without = prev.filter(p => p.id !== event.id);
          return processed ? [...without, processed] : without;
        });
      } else if (event.type === "delete") {
        setProfiles(prev => prev.filter(p => p.id !== event.id));
      }
    });

    return () => { cancelled = true; unsub(); };
  }, [user?.email, user?.id, user?.role]);

  // saveLocation uses ref — never re-creates, no stale closure
  const saveLocation = useCallback(async (lat, lng) => {
    const profile = myProfileRef.current;
    if (!profile) return;
    try {
      await base44.entities.ScentProfile.update(
        profile.id,
        locationPatch(lat, lng, profile)
      );
    } catch {
      setGeoError("Your location could not be saved. Please try again.");
    }
  }, []); // stable — no deps needed

  useEffect(() => {
    if (myProfile && userPos) saveLocation(userPos.lat, userPos.lng);
  }, [myProfile?.id]);

  // Presence heartbeat is handled app-wide by usePresence in Layout — no
  // duplicate heartbeat here (was causing 2x the gateway calls on the map page).

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
          if (mapRef.current && !mapMovedByUserRef.current) {
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
        if (mapRef.current && !mapMovedByUserRef.current) {
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
        // GPS updates move the location marker, never the map camera.
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
        if (reportedEmails.includes(p.user_email)) return false;
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
  }, [profiles, mapFilters, isBlocked, reportedEmails, youPos.lat, youPos.lng]);

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
  }, [myProfile?.avatar_url]);  

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
      {(profileError || reportError) && (
        <div role="alert" style={{ position: "absolute", top: "64px", left: "14px", right: "14px", zIndex: 1100, background: "#251b2f", color: "#fecaca", padding: "12px", borderRadius: "12px", fontSize: "13px" }}>
          {profileError || reportError}{" "}
          <button onClick={() => window.location.reload()} style={{ textDecoration: "underline" }}>Retry</button>
        </div>
      )}

      {/* Top nav bar */}
      <div style={{ position: "absolute", top: "14px", left: "14px", right: "14px", zIndex: 1000, display: "flex", alignItems: "center", gap: "8px" }}>
        {[
          { to: "/", icon: <Home size={14} />, title: "Home" },
          { to: "/messages", icon: <MessageCircle size={14} />, title: "Messages" },
          { to: "/viewers", icon: <Eye size={14} />, title: "Who Viewed Me" },
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

      <div style={{
        position: "absolute",
        bottom: "max(16px, env(safe-area-inset-bottom))",
        right: "max(16px, env(safe-area-inset-right))",
        zIndex: 1000,
        display: "flex", flexDirection: "column", gap: "8px",
      }}>
        <button
          onClick={() => mapRef.current?.flyTo({ center: [youPos.lng, youPos.lat], zoom: 14, duration: 1000 })}
          style={{
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
          onClick={() => mapRef.current?.zoomIn()}
          style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "rgba(20,17,40,0.85)", border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#c4b5fd",
          }}
          title="Zoom in"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "rgba(20,17,40,0.85)", border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#c4b5fd",
          }}
          title="Zoom out"
        >
          <Minus size={14} />
        </button>
      </div>

      <button
        onClick={toggleTracking}
        style={{
          position: "absolute", bottom: "20px", left: "14px", zIndex: 1000,
          background: "rgba(20,17,40,0.85)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "9999px", padding: "7px 14px",
          fontSize: "12px", color: tracking ? "#c4b5fd" : "#94a3b8",
          display: "flex", alignItems: "center", flexWrap: "wrap", maxWidth: "calc(100vw - 76px)", gap: "6px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          cursor: "pointer", fontFamily: "var(--font-body)",
        }}
      >
        <Eye size={13} color={tracking ? "#c4b5fd" : "#94a3b8"} />
        {filtered.length} nearby
        {hasOwnerMapView(user) && <span> · Admin view: includes inactive members</span>}
        {onlineCount > 0 && (
          <span style={{ color: "#4ade80", display: "flex", alignItems: "center", gap: "3px" }}>
            · <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", display: "inline-block" }} /> {onlineCount} online
          </span>
        )}
        {totalUsers !== null && <span> · {totalUsers.toLocaleString()} total users</span>}
      </button>

      {/* Empty state for brand new users with no profile/location */}
      {!loading && myProfile && !myProfile.location_lat && !userPos && !enableLocDismissed && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 1000, background: "rgba(20,17,40,0.95)", border: "1px solid rgba(167,139,250,0.3)",
          borderRadius: "16px", padding: "24px", maxWidth: "280px", textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          <button
            onClick={() => setEnableLocDismissed(true)}
            aria-label="Dismiss"
            style={{
              position: "absolute", top: "8px", right: "8px", background: "transparent", border: "none",
              color: "#94a3b8", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: "4px",
            }}
          >✕</button>
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

      {/* Empty hint: user is on the map but nobody nearby yet */}
      {!loading && !profileError && !reportError && userPos && filtered.length === 0 && !earlyHintDismissed && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 800, background: "rgba(20,17,40,0.92)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px", padding: "22px", maxWidth: "260px", textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          <button
            onClick={() => setEarlyHintDismissed(true)}
            aria-label="Dismiss"
            style={{
              position: "absolute", top: "8px", right: "8px", background: "transparent", border: "none",
              color: "#94a3b8", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: "4px",
            }}
          >✕</button>
          <div style={{ fontSize: "30px", marginBottom: "10px" }}>🤙</div>
          <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "15px", color: "#e2e8f0", marginBottom: "6px" }}>
            You're early!
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
            No one's nearby yet. Invite a friend to join the block — the more noses, the better.
          </p>
        </div>
      )}

      {geoError && (
        <div style={{
          position: "absolute", bottom: "60px", left: "14px", zIndex: 1000,
          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "9999px", padding: "5px 12px",
          fontSize: "11px", color: "#f87171", fontFamily: "var(--font-body)",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          {geoError}
          <button
            onClick={() => setGeoError(null)}
            aria-label="Dismiss"
            style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: "12px", lineHeight: 1, padding: 0 }}
          >✕</button>
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