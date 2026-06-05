import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import HangLooseLogo from "@/components/HangLooseLogo";
import NearbyCounter from "@/components/home/NearbyCounter";
import HeroAuth from "@/components/home/HeroAuth";
import { useAuth } from "@/lib/AuthContext";

const SCENT_CATEGORIES = [
  { emoji: "🌊", name: "Fresh", desc: "Clean, light, just-showered energy", color: "from-cyan-500/20 to-teal-500/10", border: "border-cyan-500/30" },
  { emoji: "🔥", name: "Musky", desc: "Warm, deep, magnetic presence", color: "from-amber-500/20 to-orange-500/10", border: "border-amber-500/30" },
  { emoji: "🍑", name: "Ripe", desc: "Bold, lived-in, unfiltered", color: "from-rose-500/20 to-pink-500/10", border: "border-rose-500/30" },
  { emoji: "🌱", name: "Earthy", desc: "Grounded, natural, outdoorsy", color: "from-green-500/20 to-emerald-500/10", border: "border-green-500/30" },
  { emoji: "😶", name: "Neutral", desc: "Subtle, balanced, mystery", color: "from-slate-500/20 to-slate-400/10", border: "border-slate-500/30" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Build your scent profile", desc: "Choose your category, shower frequency, vibe badges — the real you, not a highlight reel." },
  { step: "02", title: "See who's nearby", desc: "The Scent Block is a live map of people around you right now. No endless swiping." },
  { step: "03", title: "Connect honestly", desc: "Tap a profile, send a message. Chemistry happens when you stop pretending." },
];

const PRIVACY_POINTS = [
  { icon: "📍", title: "Fuzzy location mode", desc: "Show an approximate location instead of your exact spot." },
  { icon: "👻", title: "Invisible mode", desc: "Browse without appearing on the map — full ghost mode." },
  { icon: "🛡️", title: "Block & report", desc: "One tap to block anyone. Reports go straight to moderation." },
  { icon: "🔒", title: "You control your data", desc: "Choose what's visible: scent details, last active time, and more." },
];


export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen font-body">

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              You smell like{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, #a78bfa, #2dd4bf)" }}>
                someone's type.
              </span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-md">
              Real chemistry starts with the real you. Stinkrz is the scent-positive place for people who like their connections unfiltered, unapologetic, and a little bit wild.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Link to="/register">
                <Button size="lg" className="font-semibold px-8 py-5 text-base w-full sm:w-auto">
                  Join the Scent Block
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="font-semibold px-8 py-5 text-base border-border hover:border-primary/40 w-full sm:w-auto">
                  How it works
                </Button>
              </a>
            </div>
            <NearbyCounter />
          </motion.div>

          {/* Auth panel for guests / CTA for logged-in users */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="flex justify-center md:justify-end">
            {user ? (
              <div className="bg-card/60 backdrop-blur-md border border-border rounded-3xl p-8 shadow-2xl shadow-black/30 w-full max-w-sm text-center space-y-5">
                <p className="text-4xl">🤙</p>
                <h2 className="font-heading text-xl font-bold">Welcome back!</h2>
                <p className="font-body text-sm text-muted-foreground">You're on the block. See who's nearby right now.</p>
                <Link to="/scent-block">
                  <Button size="lg" className="w-full font-semibold">Open the Scent Block →</Button>
                </Link>
                <Link to="/feed">
                  <Button variant="outline" size="lg" className="w-full font-semibold">Check the Feed</Button>
                </Link>
              </div>
            ) : (
              <HeroAuth />
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Scent Categories ── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">What's your scent category?</h2>
          <p className="text-muted-foreground mb-10 max-w-xl">
            Every profile picks a scent category — an honest signal of your natural vibe. No cologne required.
          </p>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {SCENT_CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className={`bg-gradient-to-br ${cat.color} border ${cat.border} rounded-2xl p-5 text-center`}
            >
              <div className="text-3xl mb-2">{cat.emoji}</div>
              <div className="font-heading font-bold text-sm mb-1">{cat.name}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{cat.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">How it works</h2>
          <p className="text-muted-foreground mb-10 max-w-xl">Three steps. No algorithm games. No fake matching scores.</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors"
            >
              <div className="font-heading text-4xl font-bold text-primary/30 mb-4">{item.step}</div>
              <h3 className="font-heading font-semibold text-base mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Privacy & Safety ── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">Your safety, your rules.</h2>
          <p className="text-muted-foreground mb-10 max-w-xl">
            Location sharing is always optional. You choose exactly how much of yourself to reveal — and to whom.
          </p>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRIVACY_POINTS.map((pt, i) => (
            <motion.div
              key={pt.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <div className="text-2xl mb-3">{pt.icon}</div>
              <div className="font-heading font-semibold text-sm mb-1">{pt.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{pt.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-border text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Ready to find your scent match?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join the people already on the Scent Block right now.
          </p>
          <Link to="/register">
            <Button size="lg" className="font-semibold px-10 py-5 text-base">
              Create your free profile
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
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