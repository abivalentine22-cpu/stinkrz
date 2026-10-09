import React from "react";
import { SCENT_INTENSITIES, INTENSITY_DEFINITION, INTENSITY_HELP, scentIntensity } from "@/lib/scentIntensity";

export default function IntensityGuide({ value }) {
  return (
    <div className="space-y-2 font-body">
      <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
        {SCENT_INTENSITIES.map((level, index) => (
          <span key={level.label} className={Number(value) === index + 1 ? "text-primary font-semibold" : "text-muted-foreground"}>
            {level.label}
          </span>
        ))}
      </div>
      <p className="text-xs text-foreground">{scentIntensity(value).description}</p>
      <p className="text-xs text-muted-foreground">{INTENSITY_DEFINITION} {INTENSITY_HELP}</p>
    </div>
  );
}
