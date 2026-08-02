import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { VIBE_BADGE_CATEGORIES, FETISH_OPTIONS } from "@/lib/demoData";
import { ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

const SCENT_CATEGORIES = ["Fresh", "Musky", "Ripe", "Earthy", "Neutral"];
const SCENT_EMOJIS = { Fresh: "🧼", Musky: "🌲", Ripe: "🧀", Earthy: "🍂", Neutral: "⚖️" };
const LOOKING_FOR_OPTIONS = ["Casual chat", "Meetup", "Just browsing", "Friends", "Whatever happens"];
const SHOWER_OPTIONS = ["Daily", "Every other day", "Twice a week", "Weekly", "When inspired", "Classified"];
const MAX_VIBE_BADGES = 5;
const MAX_FETISHES = 6;

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Redirect if already onboarded
  useEffect(() => {
    if (!user) return;
    base44.entities.ScentProfile.filter({ user_email: user.email }).then(profiles => {
      if (profiles[0]?.onboarding_complete) navigate("/scent-block", { replace: true });
    });
  }, [user]);
  const [profile, setProfile] = useState({
    display_name: "",
    age: "",
    bio: "",
    scent_category: "",
    scent_intensity: 3,
    vibe_badges: [],
    fetishes: [],
    shower_frequency: "",
    scent_preferences: [],
    looking_for: "",
  });

  const updateProfile = (key, value) => setProfile((p) => ({ ...p, [key]: value }));

  const toggleArray = (key, value) => {
    setProfile((p) => ({
      ...p,
      [key]: p[key].includes(value) ? p[key].filter((v) => v !== value) : [...p[key], value],
    }));
  };

  const toggleBadge = (badge) => {
    setProfile((p) => {
      if (p.vibe_badges.includes(badge)) {
        return { ...p, vibe_badges: p.vibe_badges.filter((v) => v !== badge) };
      }
      if (p.vibe_badges.length >= MAX_VIBE_BADGES) return p;
      return { ...p, vibe_badges: [...p.vibe_badges, badge] };
    });
  };

  const toggleFetish = (fetish) => {
    setProfile((p) => {
      if (p.fetishes.includes(fetish)) {
        return { ...p, fetishes: p.fetishes.filter((v) => v !== fetish) };
      }
      if (p.fetishes.length >= MAX_FETISHES) return p;
      return { ...p, fetishes: [...p.fetishes, fetish] };
    });
  };

  const handleFinish = async () => {
    setLoading(true);
    await base44.entities.ScentProfile.create({
      user_email: user.email,
      display_name: profile.display_name || user?.full_name || "Anonymous",
      age: parseInt(profile.age) || 25,
      bio: profile.bio,
      scent_category: profile.scent_category || "Neutral",
      scent_intensity: profile.scent_intensity,
      vibe_badges: profile.vibe_badges,
      fetishes: profile.fetishes,
      shower_frequency: profile.shower_frequency || "Classified",
      looking_for: profile.looking_for || undefined,
      scent_preferences: profile.scent_preferences,
      is_online: true,
      onboarding_complete: true,
    });
    navigate("/scent-block");
  };

  const steps = [
    // Step 0: Basics
    <div key="basics" className="space-y-5">
      <div className="text-center mb-6">
        <p className="text-4xl mb-2">👋</p>
        <h2 className="font-heading text-xl font-bold">The Basics</h2>
        <p className="font-body text-sm text-muted-foreground">Let's get to know you (the non-smelly parts first)</p>
      </div>
      <div className="space-y-2">
        <Label className="font-body text-sm">Display Name</Label>
        <Input value={profile.display_name} onChange={(e) => updateProfile("display_name", e.target.value)} placeholder="What should we call you?" className="font-body bg-muted border-0" />
      </div>
      <div className="space-y-2">
        <Label className="font-body text-sm">Age</Label>
        <Input type="number" value={profile.age} onChange={(e) => updateProfile("age", e.target.value)} placeholder="Your age" className="font-body bg-muted border-0" />
      </div>
      <div className="space-y-2">
        <Label className="font-body text-sm">Bio</Label>
        <Textarea value={profile.bio} onChange={(e) => updateProfile("bio", e.target.value)} placeholder="Tell the block about yourself..." className="font-body bg-muted border-0 min-h-[80px]" />
      </div>
    </div>,

    // Step 1: Vibe Setup
    <div key="vibes" className="space-y-5">
      <div className="text-center mb-6">
        <p className="text-4xl mb-2">✨</p>
        <h2 className="font-heading text-xl font-bold">Vibe Setup</h2>
        <p className="font-body text-sm text-muted-foreground">Pin up to {MAX_VIBE_BADGES} badges that describe your energy</p>
        <p className="font-body text-xs text-muted-foreground mt-1">{profile.vibe_badges.length} / {MAX_VIBE_BADGES} pinned</p>
      </div>
      <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
        {VIBE_BADGE_CATEGORIES.map((cat) => (
          <div key={cat.name}>
            <p className="font-heading text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <span>{cat.emoji}</span> {cat.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {cat.badges.map((vibe) => {
                const selected = profile.vibe_badges.includes(vibe);
                const atCap = !selected && profile.vibe_badges.length >= MAX_VIBE_BADGES;
                return (
                  <Badge
                    key={vibe}
                    variant={selected ? "default" : "outline"}
                    className={`cursor-pointer font-body text-xs transition-all ${
                      selected ? "bg-secondary text-secondary-foreground" : atCap ? "opacity-40 cursor-not-allowed" : "hover:border-secondary/50"
                    }`}
                    onClick={() => toggleBadge(vibe)}
                  >
                    {vibe}
                  </Badge>
                );
              })}
            </div>
          </div>
        ))}
        <div className="pt-4 mt-2 border-t border-border">
          <p className="font-heading text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
            <span>🔥</span> Fetishes & Kinks
            <span className="ml-auto">{profile.fetishes.length} / {MAX_FETISHES}</span>
          </p>
          <p className="font-body text-[10px] text-muted-foreground mb-2">Pick up to {MAX_FETISHES} favorites.</p>
          <div className="flex flex-wrap gap-2">
            {FETISH_OPTIONS.map((fetish) => {
              const selected = profile.fetishes.includes(fetish);
              const atCap = !selected && profile.fetishes.length >= MAX_FETISHES;
              return (
                <Badge
                  key={fetish}
                  variant={selected ? "default" : "outline"}
                  className={`cursor-pointer font-body text-xs transition-all ${
                    selected ? "bg-secondary text-secondary-foreground" : atCap ? "opacity-40 cursor-not-allowed" : "hover:border-secondary/50"
                  }`}
                  onClick={() => toggleFetish(fetish)}
                >
                  {fetish}
                </Badge>
              );
            })}
          </div>
        </div>
      </div>
    </div>,

    // Step 2: Scent Preferences
    <div key="scent" className="space-y-5">
      <div className="text-center mb-6">
        <p className="text-4xl mb-2">👃</p>
        <h2 className="font-heading text-xl font-bold">Scent Preferences</h2>
        <p className="font-body text-sm text-muted-foreground">What's your vibe & what are you into?</p>
      </div>
      <div className="space-y-3">
        <Label className="font-body text-sm">Your scent category</Label>
        <div className="grid grid-cols-5 gap-2">
          {SCENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => updateProfile("scent_category", cat)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                profile.scent_category === cat
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <span className="text-2xl">{SCENT_EMOJIS[cat]}</span>
              <span className="font-body text-[10px]">{cat}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Label className="font-body text-sm">Scent intensity (1–5): {profile.scent_intensity}</Label>
        <input
          type="range"
          min={1}
          max={5}
          value={profile.scent_intensity}
          onChange={(e) => updateProfile("scent_intensity", parseInt(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] font-body text-muted-foreground">
          <span>Subtle</span><span>Nuclear</span>
        </div>
      </div>
      <div className="space-y-3">
        <Label className="font-body text-sm">Shower frequency</Label>
        <div className="flex flex-wrap gap-2">
          {SHOWER_OPTIONS.map((opt) => (
            <Badge
              key={opt}
              variant={profile.shower_frequency === opt ? "default" : "outline"}
              className="cursor-pointer font-body text-xs"
              onClick={() => updateProfile("shower_frequency", opt)}
            >
              {opt}
            </Badge>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Label className="font-body text-sm">Looking for</Label>
        <div className="flex flex-wrap gap-2">
          {LOOKING_FOR_OPTIONS.map((opt) => (
            <Badge
              key={opt}
              variant={profile.looking_for === opt ? "default" : "outline"}
              className="cursor-pointer font-body text-xs"
              onClick={() => updateProfile("looking_for", opt)}
            >
              {opt}
            </Badge>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Label className="font-body text-sm">What scents are you into?</Label>
        <div className="flex flex-wrap gap-2">
          {SCENT_CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={profile.scent_preferences.includes(cat) ? "default" : "outline"}
              className="cursor-pointer font-body text-xs transition-all"
              onClick={() => toggleArray("scent_preferences", cat)}
            >
              {SCENT_EMOJIS[cat]} {cat}
            </Badge>
          ))}
        </div>
      </div>
    </div>,

    // Step 4: Preview
    <div key="preview" className="space-y-5">
      <div className="text-center mb-6">
        <p className="text-4xl mb-2">🤙</p>
        <h2 className="font-heading text-xl font-bold">Profile Preview</h2>
        <p className="font-body text-sm text-muted-foreground">Looking good! Here's how others see you.</p>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">🤙</div>
          <div>
            <h3 className="font-heading font-bold text-lg">{profile.display_name || "Anonymous"}, {profile.age || "?"}</h3>
            <p className="font-body text-xs text-muted-foreground">{profile.scent_category || "Neutral"} · Intensity {profile.scent_intensity}/5</p>
          </div>
        </div>
        {profile.vibe_badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.vibe_badges.map((b) => (
              <Badge key={b} className="font-body text-[10px] bg-secondary text-secondary-foreground">{b}</Badge>
            ))}
          </div>
        )}
        {profile.fetishes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.fetishes.map((f) => (
              <Badge key={f} className="font-body text-[10px] bg-secondary text-secondary-foreground">{f}</Badge>
            ))}
          </div>
        )}
        {profile.bio && <p className="font-body text-sm text-muted-foreground">{profile.bio}</p>}
        {profile.scent_preferences.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {profile.scent_preferences.map((s) => (
              <Badge key={s} variant="outline" className="font-body text-[10px]">{s}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="font-heading text-2xl font-bold">Welcome to Stinkrz 🤙</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">A quick vibe check and you're in — takes about a minute.</p>
        </div>
        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="gap-1 font-body"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} className="gap-1 font-body font-semibold">
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={loading} className="gap-1 font-body font-semibold">
              {loading ? "Saving..." : "Let's Go!"}
              <Sparkles className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}