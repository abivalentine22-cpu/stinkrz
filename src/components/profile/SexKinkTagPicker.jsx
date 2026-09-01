import React from "react";
import { Badge } from "@/components/ui/badge";
import { SEX_KINK_TAG_GROUPS, SEXUAL_HEALTH_OPTIONS } from "@/lib/demoData";
import { ShieldCheck } from "lucide-react";

/**
 * Optional Sex & Kink tags + voluntary Sexual Health picker.
 * Reuses the existing Stinkrz chip styling. Nothing is preselected or required.
 *
 * Props:
 *  - sexKinkTags: string[]
 *  - onSexKinkTagsChange: (string[]) => void
 *  - sexualHealth: string[]
 *  - onSexualHealthChange: (string[]) => void
 */
export default function SexKinkTagPicker({ sexKinkTags = [], onSexKinkTagsChange, sexualHealth = [], onSexualHealthChange }) {
  const toggleTag = (tag) => {
    onSexKinkTagsChange(
      sexKinkTags.includes(tag) ? sexKinkTags.filter((t) => t !== tag) : [...sexKinkTags, tag]
    );
  };

  const toggleHealth = (opt) => {
    onSexualHealthChange(
      sexualHealth.includes(opt) ? sexualHealth.filter((t) => t !== opt) : [...sexualHealth, opt]
    );
  };

  return (
    <div className="space-y-5">
      {SEX_KINK_TAG_GROUPS.map((group) => (
        <div key={group.name} className="space-y-2">
          <p className="font-heading text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <span>{group.emoji}</span> {group.name}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.tags.map((tag) => {
              const selected = sexKinkTags.includes(tag);
              return (
                <Badge
                  key={tag}
                  variant={selected ? "default" : "outline"}
                  className={`cursor-pointer font-body text-xs transition-all ${
                    selected ? "bg-secondary text-secondary-foreground" : "hover:border-secondary/50"
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              );
            })}
          </div>
        </div>
      ))}

      <div className="space-y-2 pt-3 border-t border-border">
        <p className="font-heading text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> Sexual Health
        </p>
        <p className="font-body text-[10px] text-muted-foreground">
          Completely optional. Only shown if you choose to share.
        </p>
        <div className="flex flex-wrap gap-2">
          {SEXUAL_HEALTH_OPTIONS.map((opt) => {
            const selected = sexualHealth.includes(opt);
            return (
              <Badge
                key={opt}
                variant={selected ? "default" : "outline"}
                className={`cursor-pointer font-body text-xs transition-all ${
                  selected ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" : "hover:border-emerald-500/40"
                }`}
                onClick={() => toggleHealth(opt)}
              >
                {opt}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}