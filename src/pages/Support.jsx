import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Heart, Sparkles, ArrowLeft, Info, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const MONTHLY_GOAL = 150;
const SUPPORT_LINK = "https://buy.stripe.com/aFa7sMdjY7Cddfue6qbwk00";

export default function Support() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["support-stats"],
    queryFn: async () => (await base44.functions.invoke("support-stats", {})).data,
    staleTime: 60000, refetchInterval: 60000, retry: false,
  });
  const available = stats?.available === true && Number.isSafeInteger(stats.raised_cents);
  const raised = available ? stats.raised_cents / 100 : null;
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  const progressPct = available ? Math.min(100, Math.round((raised / MONTHLY_GOAL) * 100)) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/help"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="font-heading text-2xl font-bold">Support Stinkrz</h1>
      </div>

      {/* Contribution information */}
      <div className="flex items-start gap-3 bg-accent/10 border border-accent/25 rounded-2xl p-4 mb-6">
        <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="font-body text-xs text-accent-foreground/80 leading-relaxed">
          <span className="font-semibold">Voluntary support.</span> Continue to Stripe to choose your amount and complete a real contribution.
        </p>
      </div>

      {/* Hero / intro */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 mb-6 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Heart className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-2">Stinkrz is free to use</h2>
        <p className="font-body text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          Stinkrz doesn't charge a subscription, run ads, or sell your data. But keeping it online isn't free — servers, maps, and message delivery cost about <span className="text-foreground font-semibold">${MONTHLY_GOAL}/month</span>. If Stinkrz has been worth a whiff to you, chip in to help cover the running costs.
        </p>
      </motion.div>

      {/* Monthly goal progress meter */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {available ? stats.month : "Monthly goal"}
          </h3>
          <span className="font-body text-sm text-muted-foreground">
            <span className="text-foreground font-semibold">{available ? money(raised) : "—"}</span> of ${MONTHLY_GOAL}
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden border border-border">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
          />
        </div>
        <p className="font-body text-xs text-muted-foreground mt-3">
          {isLoading ? "Checking contributions…" : available
            ? "Completed USD contributions before Stripe fees, minus refunds; disputed payments excluded. By checkout date, Pacific time. Updates about every minute."
            : "Contribution total is temporarily unavailable. You can still support Stinkrz through Stripe."}
        </p>
      </div>

      {/* Contribution options */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="font-heading font-semibold mb-1">Choose a contribution</h3>
        <p className="font-body text-xs text-muted-foreground mb-4">Voluntary — give what feels right.</p>

        <p className="font-body text-sm text-muted-foreground mb-4">
          $5, $10, $25, or any amount you choose. Enter your contribution amount on Stripe.
        </p>
        <Button asChild className="w-full mt-5 gap-2 font-body font-semibold h-12 text-base">
          <a href={SUPPORT_LINK}>
            <Heart className="w-5 h-5" />
            Support Stinkrz
          </a>
        </Button>

      </div>

      {/* What it does / doesn't do */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          What supporting means
        </h3>
        <ul className="font-body text-sm text-muted-foreground space-y-2 leading-relaxed">
          <li className="flex gap-2.5"><span className="text-accent shrink-0 leading-6">✓</span><span>Helps cover server, map, and messaging costs so Stinkrz stays free for everyone.</span></li>
          <li className="flex gap-2.5"><span className="text-accent shrink-0 leading-6">✓</span><span>Keeps the app ad-free and independent.</span></li>
          <li className="flex gap-2.5"><span className="text-muted-foreground shrink-0 leading-6">✗</span><span>Contributions are <span className="text-foreground font-semibold">voluntary</span> — you never have to pay to use Stinkrz.</span></li>
          <li className="flex gap-2.5"><span className="text-muted-foreground shrink-0 leading-6">✗</span><span>Supporting does <span className="text-foreground font-semibold">not</span> unlock premium access, boost your profile, or give any dating advantage.</span></li>
        </ul>
      </div>

      <div className="bg-muted/30 border border-border rounded-2xl p-4 mb-6">
        <p className="font-body text-xs text-muted-foreground leading-relaxed text-center">
          Support Stinkrz is a community tip jar for operating costs only.
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