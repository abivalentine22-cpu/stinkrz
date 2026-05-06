import React, { useState } from "react";
import { motion } from "framer-motion";
import ScentCard from "@/components/scent/ScentCard";
import FilterChips from "@/components/scent/FilterChips";
import ProfileModal from "@/components/scent/ProfileModal";
import { DEMO_PROFILES } from "@/lib/demoData";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ScentBlock() {
  const [filter, setFilter] = useState("All");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const navigate = useNavigate();

  const filtered = DEMO_PROFILES
    .filter((p) => filter === "All" || p.scent_category === filter)
    .sort((a, b) => a.distance - b.distance);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-xs font-body text-muted-foreground">Your Block · Manhattan, NY</span>
        </div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Scent Block</h1>
        <p className="font-body text-sm text-muted-foreground mt-1">Nearby scent-sations, sorted closest first 👃</p>
      </motion.div>

      {/* Filters */}
      <div className="mb-6">
        <FilterChips active={filter} onChange={setFilter} />
      </div>

      {/* Proximity grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
        {filtered.map((profile, i) => (
          <ScentCard
            key={profile.id}
            profile={profile}
            index={i}
            onClick={setSelectedProfile}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🧼</p>
          <p className="font-heading text-lg font-semibold">No one matches that vibe</p>
          <p className="font-body text-sm text-muted-foreground">Try a different filter or expand your range</p>
        </div>
      )}

      {/* Profile detail modal */}
      <ProfileModal
        profile={selectedProfile}
        open={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onMessage={(profile) => {
          setSelectedProfile(null);
          navigate("/messages");
        }}
      />
    </div>
  );
}