import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserPlus, Copy, Check, Share2, ArrowLeft, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const MILESTONES = [
  { count: 1, label: "First Whiff", emoji: "👃", perk: "Your first community milestone" },
  { count: 5, label: "Connector", emoji: "🤝", perk: "Five friends welcomed to the block" },
  { count: 10, label: "Block Legend", emoji: "👑", perk: "Ten friends welcomed to the block" },
  { count: 25, label: "Scent Hustler", emoji: "🔥", perk: "Twenty-five friends welcomed to the block" },
];

export default function ReferFriends() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [inviteCount, setInviteCount] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    (async () => {
      try {
      const [profiles, stats] = await Promise.all([
        base44.entities.ScentProfile.filter({ user_email: user.email }, undefined, 1),
        base44.functions.invoke("trackReferral", { action: "stats" }),
      ]);
      if (cancelled) return;
      setProfile(profiles[0] || null);
      setInviteCount(stats.data.completed);
      } catch {
        if (!cancelled) setError("Your referral count could not be loaded. Please refresh to try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email]);

  const referralCode = profile?.id;
  const shareLink = referralCode ? `${window.location.origin}/register?ref=${referralCode}` : "";

  const handleCopy = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (!shareLink) return;
    const shareData = {
      title: "Join me on Stinkrz",
      text: "Come find your people on the Scent Block 🤙",
      url: shareLink,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        handleCopy();
      }
    } catch {}
  };

  const earnedMilestone = (m) => !loading && !error && inviteCount >= m.count;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/help"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="font-heading text-2xl font-bold">Refer Friends</h1>
      </div>

      {error && (
        <p role="alert" className="font-body text-sm text-destructive mb-6">{error}</p>
      )}

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 mb-6 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-2">Bring friends to the block</h2>
        <p className="font-body text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          Stinkrz is better with people you know. Share your link — when a friend joins and finishes their profile, your referral count grows and you earn community milestones.
        </p>
      </motion.div>

      {/* Invite count */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-body text-xs text-muted-foreground uppercase tracking-wide mb-1">Friends joined</div>
            <div className="font-heading text-4xl font-bold">{loading ? "…" : error ? "—" : inviteCount}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>

      {/* Share link */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="font-heading font-semibold mb-1">Your invite link</h3>
        <p className="font-body text-xs text-muted-foreground mb-4">Send this to a friend. They'll land straight on sign-up.</p>

        <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-full pl-4 pr-2 py-2 mb-3">
          <span className="font-body text-xs text-muted-foreground truncate flex-1">
            {shareLink || "Finish your profile to get your link…"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            disabled={!shareLink}
            className="h-8 w-8 shrink-0"
            title="Copy link"
          >
            {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleCopy}
            disabled={!shareLink}
            variant="outline"
            className="gap-2 font-body font-semibold h-11"
          >
            {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button
            onClick={handleShare}
            disabled={!shareLink}
            className="gap-2 font-body font-semibold h-11"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>

        {!shareLink && !loading && (
          <p className="font-body text-xs text-center text-muted-foreground mt-3">
            You'll get your link once your profile is set up.{" "}
            <Link to="/onboarding" className="text-primary hover:underline">Finish onboarding</Link>
          </p>
        )}
      </div>

      {/* Milestones */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="font-heading font-semibold mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Community milestones
        </h3>
        <p className="font-body text-xs text-muted-foreground mb-4">Milestones are recognition only — they never affect who sees you or your dating chances.</p>

        <div className="space-y-3">
          {MILESTONES.map((m) => {
            const earned = earnedMilestone(m);
            const progress = Math.min(100, Math.round((inviteCount / m.count) * 100));
            return (
              <div
                key={m.count}
                className={`rounded-2xl border p-4 transition-colors ${
                  earned ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${
                    earned ? "bg-primary/15" : "bg-muted/50 grayscale opacity-60"
                  }`}>
                    {m.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-semibold text-sm">{m.label}</span>
                      {earned && (
                        <span className="text-[10px] font-body font-semibold text-accent bg-accent/15 border border-accent/25 rounded-full px-2 py-0.5">
                          EARNED
                        </span>
                      )}
                    </div>
                    <p className="font-body text-xs text-muted-foreground truncate">{m.perk}</p>
                  </div>
                  <span className="font-body text-xs text-muted-foreground shrink-0">{m.count}+</span>
                </div>
                {!earned && (
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="font-heading font-semibold mb-3">How it works</h3>
        <ol className="font-body text-sm text-muted-foreground space-y-2 leading-relaxed list-decimal list-inside">
          <li>Copy your invite link or hit Share to send it to a friend.</li>
          <li>They sign up and finish their scent profile.</li>
          <li>Your invite count goes up and you earn milestones on this page.</li>
        </ol>
      </div>

      <div className="bg-muted/30 border border-border rounded-2xl p-4 mb-6">
        <p className="font-body text-xs text-muted-foreground leading-relaxed text-center">
          Referrals are about growing the community — not pay-to-win. Milestones are recognition only and don't boost your profile or change who sees you.
        </p>
      </div>

      <Link to="/help" className="block text-center">
        <Button variant="ghost" className="font-body text-sm text-muted-foreground">
          Back to Help & Safety
        </Button>
      </Link>
    </div>
  );
}