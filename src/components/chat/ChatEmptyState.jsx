import React from "react";

export default function ChatEmptyState({ partnerName, onSendMessage }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
      <span className="text-4xl">👃</span>
      <p className="font-heading text-base font-semibold">{partnerName} is waiting for a whiff</p>
      <p className="font-body text-sm text-muted-foreground max-w-[220px] mb-2">Break the ice with a line:</p>
      <div className="flex flex-col gap-2 w-full max-w-[260px]">
        {[
          `Hey ${partnerName}, your scent profile had me curious 👃`,
          "What's your go-to post-gym ritual? 😅",
          "Hot take: showering daily is overrated. Discuss.",
          "If your scent were a candle, what would it be called?",
        ].map((line) => (
          <button
            key={line}
            onClick={() => onSendMessage(line)}
            className="text-left px-3 py-2 rounded-xl bg-primary/10 border border-primary/25 text-primary text-xs font-body hover:bg-primary/20 transition-colors"
          >
            {line}
          </button>
        ))}
      </div>
    </div>
  );
}