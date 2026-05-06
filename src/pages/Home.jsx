import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import HangLooseLogo from "@/components/HangLooseLogo";

const FEATURES = [
  {
    emoji: "💨",
    title: "Scent-driven chemistry",
    desc: "Build your profile around how you naturally live, move, and smell, not just your best selfie.",
  },
  {
    emoji: "📍",
    title: "Proximity first",
    desc: "The Scent Block shows people closest to you first. No endless swiping, just nearby humans within your chosen radius.",
  },
  {
    emoji: "🛡️",
    title: "Consent and control",
    desc: "You choose what to show: distance, online status, and scent details are all in your hands. Block and report tools are always one click away.",
  },
];

const SAMPLE_PROFILE = {
  name: "Kyle",
  age: 29,
  distance: "1.2 miles away",
  online: true,
  scent: "Musky · Bold",
  quote: '"You\'ll catch my best scent after a late-night gym session or a too-long gaming streak."',
  tags: ["Nearby and active", "Ripe gamer", "Chat ready"],
};

export default function Home() {
  return (
    <div className="min-h-screen font-body">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              You smell like{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #a78bfa, #2dd4bf)" }}
              >
                someone's type.
              </span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-md">
              Real chemistry starts with the real you. Stinkrz is the scent-positive place for people who like their connections unfiltered, unapologetic, and a little bit wild.
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              <Link to="/scent-block">
                <Button size="lg" className="font-semibold px-7 py-5 text-base">
                  Join the Scent Block
                </Button>
              </Link>
              <Link to="/help">
                <Button variant="outline" size="lg" className="font-semibold px-7 py-5 text-base border-border hover:border-primary/40">
                  How it works
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              No swiping. No pretending. Just real vibes nearby.
            </div>
          </motion.div>

          {/* Right — sample profile card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl font-heading font-bold text-foreground">
                  K
                </div>
                <div className="flex-1">
                  <div className="font-heading font-semibold">
                    {SAMPLE_PROFILE.name}, {SAMPLE_PROFILE.age}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    {SAMPLE_PROFILE.distance} · online
                  </div>
                </div>
                <span className="text-xs bg-secondary/50 border border-border px-2.5 py-1 rounded-full text-foreground/80">
                  {SAMPLE_PROFILE.scent}
                </span>
              </div>
              <p className="text-sm text-muted-foreground italic mb-4 leading-relaxed">{SAMPLE_PROFILE.quote}</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_PROFILE.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-muted border border-border px-3 py-1 rounded-full text-foreground/70">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What makes Stinkrz different */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">
            What makes Stinkrz different?
          </h2>
          <p className="text-muted-foreground mb-10 max-w-xl">
            Most apps want you polished and filtered. Stinkrz is for people who know that real attraction lives in body heat, habits, and honest chemistry.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors"
            >
              <div className="text-3xl mb-4">{feat.emoji}</div>
              <h3 className="font-heading font-semibold text-base mb-2">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Scent Block preview */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">
          Get a whiff of the Scent Block.
        </h2>
        <p className="text-muted-foreground mb-10 max-w-xl">
          A live, proximity-based grid of people around you. Some show their faces, some stay low-key with the hang-loose icon, all of them are here for real-world chemistry.
        </p>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">Sneak Peek</div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Picture a grid of tiles, each one a profile with name, scent vibe, and distance. Tap to open a quick preview, send a message, or fire off a playful vibe check.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted/60 border border-border" />
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-3">Coming Soon</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Stinkrz is evolving into a full web and mobile experience. For now, we're shaping the vibe, visuals, and features with people like you.
            </p>
          </div>
        </div>
      </section>

      {/* Safety CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
        <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">
          Safe, respectful, and scent-positive.
        </h2>
        <p className="text-muted-foreground max-w-xl">
          Stinkrz is built on boundaries, consent, and mutual respect. You can blur messages, control your visibility, and report anything that doesn't feel right.
        </p>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
        <HangLooseLogo size={24} />
        <p className="font-body text-xs text-muted-foreground">© 2026 Stinkrz. All scents reserved.</p>
        <div className="flex gap-5">
          <Link to="/help" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Help</Link>
          <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  );
}