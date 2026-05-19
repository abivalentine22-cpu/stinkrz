import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Grid3X3, MessageCircle, HelpCircle, User, Menu, X, Zap, Eye, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import HangLooseLogo from "./HangLooseLogo";
import { useAuth } from "@/lib/AuthContext";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { base44 } from "@/api/base44Client";

const NAV_ITEMS = [
  { label: "Home", path: "/", icon: Home },
  { label: "Scent Block", path: "/scent-block", icon: Grid3X3 },
  { label: "Live Feed", path: "/feed", icon: Zap },
  { label: "Messages", path: "/messages", icon: MessageCircle },
  { label: "Matches", path: "/matches", icon: Heart },
  { label: "Who Viewed Me", path: "/viewers", icon: Eye },
  { label: "Help", path: "/help", icon: HelpCircle },
  { label: "Settings", path: "/settings", icon: null },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const location = useLocation();
  const { user } = useAuth();

  // Track unread message count in real-time
  useEffect(() => {
    if (!user?.email) return;
    base44.entities.ChatMessage.filter({ receiver_email: user.email, read: false })
      .then(msgs => setUnreadMessages(msgs.length));

    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === "create" && event.data.receiver_email === user.email && !event.data.read) {
        setUnreadMessages(prev => prev + 1);
      } else if (event.type === "update" && event.data.receiver_email === user.email) {
        // Re-fetch count on any update
        base44.entities.ChatMessage.filter({ receiver_email: user.email, read: false })
          .then(msgs => setUnreadMessages(msgs.length));
      }
    });
    return unsub;
  }, [user?.email]);

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
            const isMessages = item.path === "/messages";
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`font-body text-sm transition-colors flex items-center gap-1.5 relative ${active ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.path === "/settings" && <span className="text-base">⚙️</span>}
                {item.label}
                {isMessages && unreadMessages > 0 && (
                  <span className="ml-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] rounded-full flex items-center justify-center font-semibold">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user && (
            <NotificationCenter userEmail={user.email} />
          )}
          {user && (
            logoutConfirm ? (
              <div className="flex items-center gap-2">
                <span className="font-body text-xs text-muted-foreground">Log out?</span>
                <Button size="sm" variant="destructive" className="font-body font-semibold px-3 h-8 text-xs"
                  onClick={() => base44.auth.logout("/")}>Yes</Button>
                <Button size="sm" variant="ghost" className="font-body px-3 h-8 text-xs"
                  onClick={() => setLogoutConfirm(false)}>Cancel</Button>
              </div>
            ) : (
              <button onClick={() => setLogoutConfirm(true)}
                className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors px-2">
                Log out
              </button>
            )
          )}
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

        {/* Mobile: notifications + menu */}
        <div className="md:hidden flex items-center gap-1">
          {user && <NotificationCenter userEmail={user.email} />}
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
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
                  {Icon ? <Icon className="w-4 h-4" /> : <span className="text-lg">⚙️</span>}
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