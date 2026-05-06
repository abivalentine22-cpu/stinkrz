import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

const VIBE_TAGS = [
  "Looking to meet now 🔥",
  "Down to chat 💬",
  "Just vibing 🌊",
  "Out and about 📍",
  "Night energy 🌙",
  "Need a whiff buddy 👃",
  "Feeling fresh ✨",
  "Send help 😅",
];

const EXPIRY_OPTIONS = [
  { label: "1 hr", hours: 1 },
  { label: "2 hrs", hours: 2 },
  { label: "4 hrs", hours: 4 },
];

export default function PostComposer({ myProfile, onPost }) {
  const [content, setContent] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const [expiryHours, setExpiryHours] = useState(2);
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
    await onPost({
      content: content.trim(),
      vibe_tag: selectedTag,
      expires_at: expiresAt,
    });
    setContent("");
    setSelectedTag(null);
    setPosting(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <div className="flex gap-3 items-start mb-3">
        <div className="w-9 h-9 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
          {myProfile?.avatar_url
            ? <img src={myProfile.avatar_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-base">🤙</span>}
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's your vibe right now?"
          className="flex-1 font-body bg-muted border-0 min-h-[60px] resize-none text-sm"
          maxLength={200}
        />
      </div>

      {/* Vibe tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {VIBE_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`text-xs font-body px-2.5 py-1 rounded-full transition-all border ${
              selectedTag === tag
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-muted/50 border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        {/* Expiry picker */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground font-body mr-1">Expires in:</span>
          {EXPIRY_OPTIONS.map((opt) => (
            <button
              key={opt.hours}
              onClick={() => setExpiryHours(opt.hours)}
              className={`text-xs font-body px-2.5 py-1 rounded-full transition-all border ${
                expiryHours === opt.hours
                  ? "bg-accent/20 border-accent/40 text-accent"
                  : "bg-muted/50 border-border text-muted-foreground hover:border-accent/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          onClick={handlePost}
          disabled={!content.trim() || posting}
          className="gap-1.5 font-body"
        >
          <Send className="w-3.5 h-3.5" />
          Post
        </Button>
      </div>
    </div>
  );
}