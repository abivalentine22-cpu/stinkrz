import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Clock, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const SCENT_COLORS = {
  Fresh: "#34d399",
  Musky: "#fbbf24",
  Ripe: "#f87171",
  Earthy: "#fb923c",
  Neutral: "#94a3b8",
};

export default function StatusCard({ post, currentUserEmail, onDelete, onMessage, isRecommended }) {
  const navigate = useNavigate();
  const isOwn = post.user_email === currentUserEmail;
  const timeLeft = post.expires_at
    ? formatDistanceToNow(new Date(post.expires_at), { addSuffix: false })
    : null;
  const scentColor = SCENT_COLORS[post.scent_category] || "#94a3b8";

  return (
    <div className={`bg-card border rounded-2xl p-4 hover:border-primary/20 transition-colors ${
      isRecommended ? "border-primary/40 bg-primary/5" : "border-border"
    }`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center"
          style={{ boxShadow: `0 0 0 2px ${scentColor}44` }}
        >
          {post.avatar_url
            ? <img src={post.avatar_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-lg">🤙</span>}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-heading font-semibold text-sm">{post.display_name}</span>
            {post.scent_category && (
              <span className="text-[10px] font-body px-2 py-0.5 rounded-full border"
                style={{ color: scentColor, borderColor: `${scentColor}44`, background: `${scentColor}11` }}>
                {post.scent_category}
              </span>
            )}
          </div>

          {post.vibe_tag && (
            <div className="inline-flex items-center text-xs font-body text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full mb-2">
              {post.vibe_tag}
            </div>
          )}

          <p className="font-body text-sm text-foreground/90 leading-relaxed mb-2">
            {post.content}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-body">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}</span>
              {timeLeft && (
                <span className="ml-1 opacity-60">· expires in {timeLeft}</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {isOwn ? (
                <button
                  onClick={() => onDelete(post.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMessage(post)}
                  className="h-7 px-2.5 text-xs font-body gap-1 text-accent hover:text-accent"
                >
                  <MessageCircle className="w-3 h-3" />
                  Whiff
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}