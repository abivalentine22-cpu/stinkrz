import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import ProfileCompletenessBanner from "./ProfileCompletenessBanner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePresence } from "@/hooks/usePresence";

const NO_GATE_PATHS = ["/onboarding", "/sign-in", "/register", "/forgot-password", "/reset-password", "/terms", "/privacy", "/scent-block"];

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMap = pathname === "/scent-block";
  const { data: myProfile, isSuccess } = useQuery({
    queryKey: ["layout-profile", user?.email],
    enabled: !!user?.email,
    queryFn: async () => (await base44.entities.ScentProfile.filter({ user_email: user.email }))[0] || null,
    staleTime: 60000,
    retry: false,
  });

  useEffect(() => {
    if (!user?.email || !isSuccess || myProfile || NO_GATE_PATHS.includes(pathname)) return;
    let cancelled = false;
    // A successful empty profile result needs fresh auth before onboarding.
    base44.auth.me().then(() => {
      if (!cancelled) navigate("/onboarding", { replace: true });
    }).catch(() => {
      if (!cancelled) base44.auth.redirectToLogin(window.location.href);
    });
    return () => { cancelled = true; };
  }, [user?.email, isSuccess, myProfile, pathname, navigate]);

  // App-wide presence: keep the user "online" + location fresh on every page,
  // respecting invisible/fuzzy privacy toggles. (The Scent Block map owns its
  // own live geolocation while open; this covers the rest of the app.)
  usePresence({ userEmail: user?.email, profile: myProfile, pathname });

  const showBanner = !isMap && myProfile && myProfile.onboarding_complete;

  return (
    <div className="min-h-screen bg-background">
      {!isMap && <Navbar />}
      <main className={isMap ? "" : "pt-16"}>
        {showBanner && <ProfileCompletenessBanner profile={myProfile} />}
        <Outlet />
      </main>
    </div>
  );
}