import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import HangLooseLogo from "@/components/HangLooseLogo";
import { ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {}
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <HangLooseLogo size={48} className="justify-center mb-4" />
          <h1 className="font-heading text-2xl font-bold">Forgot Password</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">We'll help you get back on the block</p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="font-body text-sm">If an account exists for <strong>{email}</strong>, we've sent a password reset link.</p>
            </div>
            <Link to="/sign-in">
              <Button variant="outline" className="gap-2 font-body">
                <ArrowLeft className="w-4 h-4" />
                Back to Log In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body text-sm">Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="font-body bg-muted border-0" />
            </div>
            <Button type="submit" disabled={loading} className="w-full font-body font-semibold">
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <Link to="/sign-in" className="block text-center font-body text-xs text-muted-foreground hover:text-primary transition-colors">
              Back to Log In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}