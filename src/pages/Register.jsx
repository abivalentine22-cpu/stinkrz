import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import HangLooseLogo from "@/components/HangLooseLogo";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState("register"); // register | otp
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setStep("otp");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await base44.auth.verifyOtp({ email, otpCode });
      base44.auth.setToken(res.access_token);
      window.location.href = "/onboarding";
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/onboarding");
  };

  const handleResend = async () => {
    try {
      await base44.auth.resendOtp(email);
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <HangLooseLogo size={48} className="justify-center mb-4" />
          <h1 className="font-heading text-2xl font-bold">How fresh are you?</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">Quick Join — it takes 30 seconds 🤙</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm font-body text-destructive">
            {error}
          </div>
        )}

        {step === "register" ? (
          <>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-body text-sm">Email</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="font-body bg-muted border-0" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Password</Label>
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="font-body bg-muted border-0" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Confirm Password</Label>
                <Input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="font-body bg-muted border-0" />
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <span className="font-body text-xs text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link to="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>
                </span>
              </label>
              <Button type="submit" disabled={loading || !agreedToTerms} className="w-full font-body font-semibold">
                {loading ? "Creating account..." : "Join the Block"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-background px-3 text-xs font-body text-muted-foreground">or</span></div>
            </div>

            <Button variant="outline" onClick={handleGoogle} className="w-full gap-2 font-body">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </Button>
          </>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="font-body text-sm text-muted-foreground text-center">
              We sent a verification code to <strong>{email}</strong>
            </p>
            <div className="space-y-2">
              <Label className="font-body text-sm">Verification Code</Label>
              <Input required value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Enter code" className="font-body bg-muted border-0 text-center text-lg tracking-widest" />
            </div>
            <Button type="submit" disabled={loading} className="w-full font-body font-semibold">
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>
            <button type="button" onClick={handleResend} className="w-full text-center font-body text-xs text-muted-foreground hover:text-primary transition-colors">
              Didn't get a code? Resend
            </button>
          </form>
        )}

        <p className="text-center font-body text-sm text-muted-foreground">
          Already on the block?{" "}
          <Link to="/sign-in" className="text-primary hover:underline font-semibold">Log In</Link>
        </p>
      </div>
    </div>
  );
}