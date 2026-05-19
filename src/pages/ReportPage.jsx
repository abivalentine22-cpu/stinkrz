import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Shield, Send, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLocation } from "react-router-dom";

export default function ReportPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const [form, setForm] = useState({
    reported_user_name: location.state?.reportedName || "",
    reported_user_email: location.state?.reportedEmail || "",
    reason: "",
    details: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const user = await base44.auth.me();
    await base44.entities.Report.create({
      reporter_email: user?.email || "anonymous",
      reported_user_email: form.reported_user_email || form.reported_user_name.toLowerCase().replace(/\s/g, "") + "@stinkrz.demo",
      reported_user_name: form.reported_user_name,
      reason: form.reason,
      details: form.details,
      status: "pending",
    });
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">Report Submitted</h1>
          <p className="font-body text-muted-foreground">
            Thank you for helping keep Stinkrz safe. Our team will review your report within 24 hours.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Report a User</h1>
            <p className="font-body text-sm text-muted-foreground">Help us keep the community safe</p>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label className="font-body text-sm">Username of person you're reporting</Label>
          <Input
            required
            value={form.reported_user_name}
            onChange={(e) => setForm({ ...form, reported_user_name: e.target.value })}
            placeholder="e.g. Marcus"
            className="font-body bg-muted border-0"
          />
        </div>

        <div className="space-y-2">
          <Label className="font-body text-sm">Reason</Label>
          <Select required value={form.reason} onValueChange={(val) => setForm({ ...form, reason: val })}>
            <SelectTrigger className="font-body bg-muted border-0">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Harassment">Harassment</SelectItem>
              <SelectItem value="Fake profile">Fake profile</SelectItem>
              <SelectItem value="Inappropriate content">Inappropriate content</SelectItem>
              <SelectItem value="Spam">Spam</SelectItem>
              <SelectItem value="Threatening behavior">Threatening behavior</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="font-body text-sm">Details (optional)</Label>
          <Textarea
            value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
            placeholder="Tell us what happened..."
            className="font-body bg-muted border-0 min-h-[120px]"
          />
        </div>

        <Button type="submit" disabled={loading || !form.reason || !form.reported_user_name} className="w-full gap-2 font-body font-semibold">
          <Send className="w-4 h-4" />
          {loading ? "Submitting..." : "Submit Report"}
        </Button>
      </form>
    </div>
  );
}