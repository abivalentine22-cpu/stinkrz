import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, ArrowLeft } from "lucide-react";
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
  const navigate = useNavigate();
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

  useEffect(() => {
    if (prefs) {
      setSelected(prefs.preferred_scent_categories || []);
    }
  }, [prefs]);

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
      toast({ title: "Preferences saved!", description: "Your scent preferences have been updated." });
    },
  });

  const toggleCategory = (cat) => {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
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

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full mt-6 gap-2 font-body font-semibold"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}