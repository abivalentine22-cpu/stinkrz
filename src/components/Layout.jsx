import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import ProfileCompletenessBanner from "./ProfileCompletenessBanner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const NO_GATE_PATHS = ["/onboarding", "/sign-in", "/register", "/forgot-password", "/reset-password", "/terms", "/privacy", "/scent-block"];

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMap = pathname === "/scent-block";
  const [myProfile, setMyProfile] = useState(null);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (!user?.email) { setProfileChecked(true); return; }
    base44.entities.ScentProfile.filter({ user_email: user.email })
      .then(p => {
        const profile = p[0] || null;
        setMyProfile(profile);
        setProfileChecked(true);
        // Redirect to onboarding if user has no profile and isn't already on an exempt path
        if (!profile && !NO_GATE_PATHS.includes(pathname)) {
          navigate("/onboarding", { replace: true });
        }
      });
  }, [user?.email, pathname]);

  const showBanner = !isMap && myProfile && myProfile.onboarding_complete;

  if (!profileChecked && user?.email) return null; // wait for check before rendering

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