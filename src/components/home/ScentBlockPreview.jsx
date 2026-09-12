import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const PINS = [
  { top: "22%", left: "28%", color: "#34d399" },
  { top: "40%", left: "60%", color: "#fbbf24" },
  { top: "62%", left: "20%", color: "#f87171" },
  { top: "70%", left: "52%", color: "#fb923c" },
  { top: "30%", left: "78%", color: "#a78bfa", you: true },
];

export default function ScentBlockPreview() {
  const { user } = useAuth();
  const dest = user ? "/scent-block" : "/register";

  return (
    <section className="max-w-6xl mx-auto px-6 py-8 md:py-10">
      <div className="grid md:grid-cols-2 gap-6 items-center bg-card/40 border border-border rounded-3xl p-5 md:p-6 overflow-hidden">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-body text-accent mb-3">
            <MapPin className="w-3.5 h-3.5" /> The Scent Block
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-2">A live map of people near you.</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-5 max-w-md">
            No endless swiping. The Scent Block shows who's actually around right now — their scent, their vibe, their energy. Tap a pin to say hi.
          </p>
          <Link to={dest}>
            <Button size="lg" className="font-semibold">Open the Scent Block →</Button>
          </Link>
        </div>

        {/* Stylized map visual */}
        <div className="relative h-44 md:h-56 rounded-2xl overflow-hidden border border-border" style={{ background: "radial-gradient(circle at 50% 40%, hsl(258 30% 16%), hsl(258 35% 8%))" }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(hsl(258 25% 25%) 1px, transparent 1px), linear-gradient(90deg, hsl(258 25% 25%) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          {PINS.map((pin, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              style={{ position: "absolute", top: pin.top, left: pin.left }}
            >
              {pin.you ? (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ background: pin.color, width: "14px", height: "14px", opacity: 0.4 }} />
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-background" style={{ background: pin.color }} />
                </div>
              ) : (
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: pin.color, boxShadow: `0 0 0 4px ${pin.color}22` }} />
              )}
            </motion.div>
          ))}
          <div className="absolute bottom-2 right-3 text-[10px] font-body text-muted-foreground">live preview</div>
        </div>
      </div>
    </section>
  );
}