import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function EmptyState({ icon = "💨", title, subtitle, actionLabel, to, onAction, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center text-muted-foreground", className)}>
      <div className="text-5xl mb-3 opacity-90">{icon}</div>
      <p className="font-heading text-sm font-semibold text-foreground mb-1">{title}</p>
      {subtitle && (
        <p className="font-body text-xs text-muted-foreground max-w-[16rem] leading-relaxed">{subtitle}</p>
      )}
      {actionLabel && to && (
        <Link
          to={to}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-body font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && !to && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-body font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}