import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Droplets, ShowerHead, Clock, MessageCircle, Heart } from "lucide-react";
import { format } from "date-fns";

const SCENT_COLORS = {
  Fresh: "text-emerald-400",
  Musky: "text-amber-400",
  Ripe: "text-red-400",
  Earthy: "text-orange-400",
  Neutral: "text-slate-400",
};

export default function ProfileModal({ profile, open, onClose, onMessage }) {
  if (!profile) return null;

  const intensityDots = Array.from({ length: 5 }, (_, i) => i < (profile.scent_intensity || 0));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto p-0">
        {/* Hero image */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden rounded-t-lg">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl opacity-20">🤙</div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card to-transparent h-24" />
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            {profile.is_online ? (
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
            )}
            <span className="text-xs font-body text-muted-foreground">
              {profile.is_online ? "Online now" : "Recently active"}
            </span>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Name & distance */}
          <div>
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl">
                {profile.display_name}, {profile.age}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-body">{profile.distance} miles away</span>
            </div>
          </div>

          {/* Scent info */}
          <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
            <div>
              <p className="text-xs text-muted-foreground font-body">Scent Category</p>
              <p className={`font-heading font-semibold ${SCENT_COLORS[profile.scent_category]}`}>
                {profile.scent_category}
              </p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-xs text-muted-foreground font-body">Intensity</p>
              <div className="flex gap-0.5 mt-0.5">
                {intensityDots.map((filled, i) => (
                  <Droplets key={i} className={`w-3.5 h-3.5 ${filled ? "text-primary" : "text-muted-foreground/20"}`} />
                ))}
              </div>
            </div>
            {profile.shower_frequency && (
              <>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-xs text-muted-foreground font-body">Showers</p>
                  <div className="flex items-center gap-1">
                    <ShowerHead className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs font-body font-medium">{profile.shower_frequency}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {profile.last_showered && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="font-body">Last showered: {format(new Date(profile.last_showered), "MMM d, yyyy")}</span>
            </div>
          )}

          {/* Bio */}
          <p className="font-body text-sm leading-relaxed">{profile.bio}</p>

          {/* Vibe badges */}
          {profile.vibe_badges?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-body mb-2">Vibe Check</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.vibe_badges.map((badge) => (
                  <Badge key={badge} variant="secondary" className="font-body text-xs bg-secondary/20 text-secondary border border-secondary/30">
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Fetishes & Kinks */}
          {profile.fetishes?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-body mb-2">Fetishes & Kinks</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.fetishes.map((fetish) => (
                  <Badge key={fetish} variant="secondary" className="font-body text-xs bg-destructive/10 text-destructive border border-destructive/30">
                    {fetish}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Scent preferences */}
          {profile.scent_preferences?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-body mb-2">Into these scents</p>
              <div className="flex gap-1.5">
                {profile.scent_preferences.map((s) => (
                  <Badge key={s} variant="outline" className="font-body text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button className="flex-1 gap-2 font-body font-semibold" onClick={() => onMessage?.(profile)}>
              <MessageCircle className="w-4 h-4" />
              Send a Whiff
            </Button>
            <Button variant="outline" size="icon" className="border-destructive/30 hover:bg-destructive/10">
              <Heart className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}