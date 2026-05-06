import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import HangLooseLogo from "@/components/HangLooseLogo";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Scent-Based Discovery",
    desc: "Find your people by vibe, not just looks. Fresh, Musky, Earthy — we don't judge.",
  },
  {
    icon: Zap,
    title: "Proximity Grid",
    desc: "See who's nearby. No swiping fatigue — just browse the block and shoot your shot.",
  },
  {
    icon: Shield,
    title: "Real & Raw",
    desc: "Honest profiles, quirky prompts, and zero pretense. Be yourself (and your scent).",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="absolute top-20 left-10 text-[200px] opacity-[0.03] select-none rotate-12">🤙</div>
        <div className="absolute bottom-10 right-10 text-[150px] opacity-[0.03] select-none -rotate-12">👃</div>

        <div className="relative max-w-5xl mx-auto px-4 pt-24 pb-20 md:pt-36 md:pb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-center mb-6">
              <HangLooseLogo size={56} />
            </div>
            <p className="font-body text-sm md:text-base text-primary tracking-widest uppercase mb-4">
              you smell like someone's type
            </p>
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              Dating that hits
              <br />
              <span className="text-primary">different</span>
              <span className="text-accent">.</span>
            </h1>
            <p className="font-body text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              The world's first scent-themed social discovery app. No filters, no faking it. Just real people, real vibes, and real... aromas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="gap-2 font-heading font-semibold text-lg px-8 py-6 rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                  How fresh are you?
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/scent-block">
                <Button variant="outline" size="lg" className="gap-2 font-body text-lg px-8 py-6 rounded-full border-border hover:border-primary/40">
                  Browse the Block
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{feat.title}</h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA strip */}
      <section className="border-t border-b border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <p className="text-5xl mb-4 select-none">👃</p>
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">
            Ready to find your scent match?
          </h2>
          <p className="font-body text-muted-foreground mb-8 max-w-lg mx-auto">
            Join thousands of beautifully fragrant (and questionably fragrant) people near you.
          </p>
          <Link to="/register">
            <Button size="lg" className="gap-2 font-heading font-semibold rounded-full px-8 py-6">
              How fresh are you?
              <span className="text-lg">🤙</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <HangLooseLogo size={24} />
        <p className="font-body text-xs text-muted-foreground">
          © 2026 Stinkrz. All scents reserved. Shower responsibly.
        </p>
        <div className="flex gap-4">
          <Link to="/help" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Help</Link>
          <Link to="/help" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Safety</Link>
          <Link to="/help" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  );
}