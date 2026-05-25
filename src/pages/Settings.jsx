import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, ArrowLeft, Eye, Volume2, CheckCheck, Lock, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

const SCENT_CATEGORIES = ["Fresh", "Musky", "Ripe", "Earthy", "Neutral"];

const SCENT_EMOJIS = {
  Fresh: "🧼",
  Musky: "🌲",
  Ripe: "🧀",
  Earthy: "🍂",
  Neutral: "⚖️",
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prefs = null } = useQuery({
    queryKey: ["user-preferences", user?.email],
    queryFn: async () => {
      const results = await base44.entities.UserPreferences.filter({
        user_email: user?.email,
      });
      return results[0] || null;
    },
    enabled: !!user?.email,
  });

  const [selected, setSelected] = useState([]);
  const [fuzzyLocation, setFuzzyLocation] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [sendReadReceipts, setSendReadReceipts] = useState(true);
  const [hideReadReceipts, setHideReadReceipts] = useState(false);
  const [travelMode, setTravelMode] = useState("neither");
  const [invisibleMode, setInvisibleMode] = useState(false);
  const [hideInactive, setHideInactive] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    if (prefs) {
      setSelected(prefs.preferred_scent_categories || []);
    }
    setSoundEnabled(localStorage.getItem("stinkrz_sound") !== "false");
    setShowOnlineStatus(localStorage.getItem("stinkrz_show_online") !== "false");
    setFuzzyLocation(localStorage.getItem("stinkrz_fuzzy_location") === "true");
    setSendReadReceipts(localStorage.getItem("stinkrz_send_read_receipts") !== "false");
    setHideReadReceipts(localStorage.getItem("stinkrz_hide_read_receipts") === "true");
    setTravelMode(localStorage.getItem("stinkrz_travel_mode") || "neither");
    setHideInactive(localStorage.getItem("stinkrz_hide_inactive") === "true");
    // Load invisible mode from profile
    base44.entities.ScentProfile.filter({ user_email: user.email }).then(p => {
      if (p[0]) { setMyProfile(p[0]); setInvisibleMode(p[0].invisible_mode || false); }
    });
  }, [prefs, user?.email]);

  const toggleInvisibleMode = async () => {
    const next = !invisibleMode;
    setInvisibleMode(next);
    if (myProfile) {
      await base44.entities.ScentProfile.update(myProfile.id, { invisible_mode: next });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (prefs) {
        return base44.entities.UserPreferences.update(prefs.id, {
          preferred_scent_categories: selected,
        });
      } else {
        return base44.entities.UserPreferences.create({
          user_email: user.email,
          preferred_scent_categories: selected,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      toast({ title: "Settings saved!", description: "Your preferences have been updated." });
    },
  });

  const toggleCategory = (cat) => {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleToggle = (key, value, setter) => {
    setter(!value);
    localStorage.setItem(key, String(!value));
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
      </div>

      {/* Scent Preferences */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <h2 className="font-heading font-semibold text-lg mb-3">Preferred Scents</h2>
        <p className="font-body text-sm text-muted-foreground mb-4">
          Select the scent categories you're interested in. We'll recommend matches based on your preferences.
        </p>

        <div className="flex flex-wrap gap-2">
          {SCENT_CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={selected.includes(cat) ? "default" : "outline"}
              className="cursor-pointer font-body text-sm px-4 py-2 transition-all"
              onClick={() => toggleCategory(cat)}
            >
              <span className="mr-2">{SCENT_EMOJIS[cat]}</span>
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <h3 className="font-heading text-sm font-semibold mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Privacy Settings
        </h3>
        <div className="space-y-3">
          {/* Approximate Location */}
          <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4 border border-border">
            <div className="flex-1">
              <p className="font-body text-sm font-semibold">Approximate Location</p>
              <p className="font-body text-xs text-muted-foreground">Show location within ~½ mile</p>
            </div>
            <button
              onClick={async () => {
                handleToggle("stinkrz_fuzzy_location", fuzzyLocation, setFuzzyLocation);
                if (myProfile) await base44.entities.ScentProfile.update(myProfile.id, { fuzzy_location: !fuzzyLocation });
              }}
              className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${fuzzyLocation ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${fuzzyLocation ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>

          {/* Show Online Status */}
          <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4 border border-border">
            <div className="flex-1">
              <p className="font-body text-sm font-semibold">Show Online Status</p>
              <p className="font-body text-xs text-muted-foreground">Let others see when you're active</p>
            </div>
            <button
              onClick={() => handleToggle("stinkrz_show_online", showOnlineStatus, setShowOnlineStatus)}
              className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${showOnlineStatus ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${showOnlineStatus ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>

          {/* Invisible Mode */}
          <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4 border border-border">
            <div className="flex-1">
              <p className="font-body text-sm font-semibold">👻 Invisible Mode</p>
              <p className="font-body text-xs text-muted-foreground">Browse the map without appearing to others</p>
            </div>
            <button
              onClick={toggleInvisibleMode}
              className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${invisibleMode ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${invisibleMode ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>

          {/* Hide Inactive Users */}
          <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4 border border-border">
            <div className="flex-1">
              <p className="font-body text-sm font-semibold">Hide Inactive Users</p>
              <p className="font-body text-xs text-muted-foreground">Don't show offline profiles on map</p>
            </div>
            <button
              onClick={() => handleToggle("stinkrz_hide_inactive", hideInactive, setHideInactive)}
              className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${hideInactive ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${hideInactive ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Sound Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <h3 className="font-heading text-sm font-semibold mb-4 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          Sound Settings
        </h3>
        <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4 border border-border">
          <div className="flex-1">
            <p className="font-body text-sm font-semibold">Notification Sounds</p>
            <p className="font-body text-xs text-muted-foreground">Play sound on new messages</p>
          </div>
          <button
            onClick={() => handleToggle("stinkrz_sound", soundEnabled, setSoundEnabled)}
            className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${soundEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${soundEnabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Read Receipt Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <h3 className="font-heading text-sm font-semibold mb-4 flex items-center gap-2">
          <CheckCheck className="w-4 h-4 text-primary" />
          Read Receipts
        </h3>
        <div className="space-y-3">
          {/* Send Read Receipts */}
          <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4 border border-border">
            <div className="flex-1">
              <p className="font-body text-sm font-semibold">Send Read Receipts</p>
              <p className="font-body text-xs text-muted-foreground">Let others know you've read their messages</p>
            </div>
            <button
              onClick={() => handleToggle("stinkrz_send_read_receipts", sendReadReceipts, setSendReadReceipts)}
              className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${sendReadReceipts ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${sendReadReceipts ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>

          {/* Hide Read Receipts */}
          <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4 border border-border">
            <div className="flex-1">
              <p className="font-body text-sm font-semibold">Hide Read Receipts</p>
              <p className="font-body text-xs text-muted-foreground">Don't see when others read your messages</p>
            </div>
            <button
              onClick={() => handleToggle("stinkrz_hide_read_receipts", hideReadReceipts, setHideReadReceipts)}
              className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${hideReadReceipts ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${hideReadReceipts ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Travel / Mobility Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <h3 className="font-heading text-sm font-semibold mb-4">Travel / Mobility</h3>
        <p className="font-body text-xs text-muted-foreground mb-3">What's your situation?</p>
        <div className="space-y-2">
          {[
            { value: "neither", label: "Just living here" },
            { value: "hosting", label: "Looking to host" },
            { value: "traveling", label: "Looking to travel" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setTravelMode(opt.value);
                localStorage.setItem("stinkrz_travel_mode", opt.value);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                travelMode === opt.value
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted/50 border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              <p className="font-body text-sm font-semibold">{opt.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Block Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <h3 className="font-heading text-sm font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          Block Settings
        </h3>
        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <p className="font-body text-xs text-muted-foreground">Manage your blocked users</p>
          <p className="font-body text-sm text-muted-foreground italic mt-2">No blocked users yet</p>
        </div>
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full gap-2 font-body font-semibold mb-5"
      >
        <Save className="w-4 h-4" />
        {saveMutation.isPending ? "Saving..." : "Save All Settings"}
      </Button>

      {/* Danger Zone — Account Deletion */}
      <div className="bg-card border border-destructive/20 rounded-2xl p-6">
        <h3 className="font-heading text-sm font-semibold mb-1 flex items-center gap-2 text-destructive">
          <Trash2 className="w-4 h-4" />
          Danger Zone
        </h3>
        <p className="font-body text-xs text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        {!deleteConfirm ? (
          <Button
            variant="outline"
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 font-body"
            onClick={() => setDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete My Account
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="font-body text-sm text-destructive font-semibold text-center">
              Are you absolutely sure? All your data will be gone forever.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 font-body"
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-body"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  await base44.functions.invoke("deleteAccount", {});
                  base44.auth.logout("/");
                }}
              >
                {deleting ? "Deleting…" : "Yes, Delete Everything"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}