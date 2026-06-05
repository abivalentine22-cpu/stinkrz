import React from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Droplets } from "lucide-react";
import { motion } from "framer-motion";
import UserAvatar from "@/components/UserAvatar";
import HangLooseLogo from "@/components/HangLooseLogo";

const SCENT_COLORS = {
  Fresh: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Musky: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Ripe: "bg-red-500/20 text-red-400 border-red-500/30",
  Earthy: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Neutral: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function ScentCard({ profile, onClick, index = 0 }) {
  const intensityDots = Array.from({ length: 5 }, (_, i) => i < (profile.scent_intensity || 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onClick?.(profile)}
      className="group cursor-pointer bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Avatar */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-25">
            <HangLooseLogo size={64} />
          </div>
        )}
        {/* Online indicator */}
        <div className="absolute top-3 right-3">
          {profile.is_online ? (
            <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-card shadow-lg shadow-green-500/50" />
          ) : (
            <div className="w-3 h-3 rounded-full bg-muted-foreground/40 ring-2 ring-card" />
          )}
        </div>
        {/* Distance overlay */}
        <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-primary" />
          <span className="text-xs font-body font-medium">{profile.distance} mi</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm truncate">
            {profile.display_name}, {profile.age}
          </h3>
        </div>

        {/* Scent category */}
        {profile.scent_category && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${SCENT_COLORS[profile.scent_category]}`}>
              {profile.scent_category}
            </Badge>
            <div className="flex gap-0.5">
              {intensityDots.map((filled, i) => (
                <Droplets key={i} className={`w-2.5 h-2.5 ${filled ? "text-primary" : "text-muted-foreground/30"}`} />
              ))}
            </div>
          </div>
        )}

        {/* Vibe badges */}
        {profile.vibe_badges?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.vibe_badges.slice(0, 2).map((badge) => (
              <span key={badge} className="text-[10px] font-body px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary">
                {badge}
              </span>
            ))}
            {profile.vibe_badges.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{profile.vibe_badges.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}