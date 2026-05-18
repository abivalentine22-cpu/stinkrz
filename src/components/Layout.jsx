import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import ProfileCompletenessBanner from "./ProfileCompletenessBanner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export default function Layout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isMap = pathname === "/scent-block";
  const [myProfile, setMyProfile] = useState(null);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.ScentProfile.filter({ user_email: user.email })
      .then(p => setMyProfile(p[0] || null));
  }, [user?.email]);

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