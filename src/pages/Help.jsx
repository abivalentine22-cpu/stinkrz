import React from "react";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, MessageCircle, Users, Lock, Eye, ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const SECTIONS = [
  {
    icon: Shield,
    title: "Safety First",
    content: "Stinkrz takes your safety seriously (even if our name doesn't). Never share personal info like your address or financial details. Meet in public places — preferably ones with good ventilation. Trust your nose... and your gut.",
  },
  {
    icon: Users,
    title: "Community Guidelines",
    content: "Be real, be kind, be yourself. No catfishing, no harassment, no hate speech. Body shaming is strictly prohibited — we celebrate ALL scent profiles here. Remember: someone's hygiene routine is their business.",
  },
  {
    icon: Lock,
    title: "Privacy & Data",
    content: "Your scent data is sacred. We never share your profile information with third parties (we're not THAT stinky). You control what's visible on your profile. Location is approximate — we show neighborhoods, not addresses.",
  },
  {
    icon: Eye,
    title: "Blocking & Reporting",
    content: "If someone makes you uncomfortable, block them instantly from any chat. You can also report users for safety violations. Our moderation team reviews all reports within 24 hours. Repeat offenders get permanently banned.",
  },
  {
    icon: AlertTriangle,
    title: "Scam Awareness",
    content: "If someone asks for money, crypto, or gift cards — that's a scam, not a love connection. Report suspicious accounts immediately. Real Stinkrz users never ask for financial help from matches.",
  },
];

const FAQS = [
  { q: "What are Scent Categories?", a: "Your scent category (Fresh, Musky, Ripe, Earthy, Neutral) is a fun way to describe your vibe. It's self-reported and totally optional — think of it as a personality type, but for your nose." },
  { q: "How does the proximity grid work?", a: "The Scent Block shows you nearby users sorted by distance. The closer they are, the higher they appear. It uses your approximate location — never your exact address." },
  { q: "What are Vibe Badges?", a: "Vibe badges are fun tags that describe your lifestyle and personality. Pick ones that resonate — like 'Morning Shower Gang' or '3-in-1 Enthusiast'. They help others get a quick read on your vibe." },
  { q: "How do I report someone?", a: "Tap the shield icon in any chat, or visit the Report page from the Help section. Provide details and our team will investigate within 24 hours." },
  { q: "Can I hide my shower frequency?", a: "Absolutely. All profile fields except your name are optional. Your hygiene habits are your business — share only what you're comfortable with." },
  { q: "What's a Vibe Check?", a: "The 🤙 Vibe Check is a spontaneous, randomized scent-themed reaction. Tap it in any chat for a fun surprise. It's purely for entertainment — no actual smelling involved (unfortunately)." },
];

export default function Help() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-3xl font-bold mb-2">Help & Safety</h1>
        <p className="font-body text-muted-foreground mb-8">Everything you need to navigate Stinkrz safely and have a great time.</p>
      </motion.div>

      {/* Safety sections */}
      <div className="space-y-4 mb-12">
        {SECTIONS.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold mb-1.5">{section.title}</h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* FAQs */}
      <div className="mb-12">
        <h2 className="font-heading text-xl font-bold mb-4">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {FAQS.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="font-heading text-sm font-semibold py-4 hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="font-body text-sm text-muted-foreground pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Report CTA */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" />
        <h3 className="font-heading font-semibold text-lg mb-2">Need to report something?</h3>
        <p className="font-body text-sm text-muted-foreground mb-4">
          If you've experienced harassment, abuse, or feel unsafe, let us know immediately.
        </p>
        <Link to="/report">
          <Button variant="destructive" className="font-body font-semibold gap-2">
            <Shield className="w-4 h-4" />
            Submit a Report
          </Button>
        </Link>
      </div>
    </div>
  );
}