import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Grid3X3, MessageCircle, HelpCircle, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import HangLooseLogo from "./HangLooseLogo";
import { useAuth } from "@/lib/AuthContext";

const NAV_ITEMS = [
  { label: "Home", path: "/", icon: Home },
  { label: "Scent Block", path: "/scent-block", icon: Grid3X3 },
  { label: "Messages", path: "/messages", icon: MessageCircle },
  { label: "Help", path: "/help", icon: HelpCircle },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="shrink-0">
          <HangLooseLogo size={32} />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`font-body text-sm transition-colors ${active ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <Link to="/profile">
              <Button size="sm" className="font-body font-semibold px-5">
                Profile
              </Button>
            </Link>
          ) : (
            <Link to="/sign-in">
              <Button size="sm" className="font-body font-semibold px-5">
                Log In
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-background border-b border-border px-4 pb-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={active ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 font-body ${active ? "" : "text-muted-foreground"}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
          <Link to={user ? "/profile" : "/sign-in"} onClick={() => setMobileOpen(false)}>
            <Button variant="outline" className="w-full justify-start gap-3 font-body mt-2">
              <User className="w-4 h-4" />
              {user ? "Profile" : "Log In"}
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
}