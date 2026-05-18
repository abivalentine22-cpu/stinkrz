import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout() {
  const { pathname } = useLocation();
  const isMap = pathname === "/scent-block";

  return (
    <div className="min-h-screen bg-background">
      {!isMap && <Navbar />}
      <main className={isMap ? "" : "pt-16"}>
        <Outlet />
      </main>
    </div>
  );
}