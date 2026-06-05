import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function HeroAuth() {
  const [mode, setMode] = useState("register"); // register | login | otp
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords don't match"); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setMode("otp");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/scent-block";
    } catch (err) {
      setError(err.message || "Invalid email or password");
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
    base44.auth.loginWithProvider("google", mode === "login" ? "/" : "/onboarding");
  };

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="bg-card/60 backdrop-blur-md border border-border rounded-3xl p-7 shadow-2xl shadow-black/30 w-full max-w-sm">
      {/* Tab toggle */}
      {mode !== "otp" && (
        <div className="flex bg-muted rounded-full p-1 mb-6">
          <button
            onClick={() => switchMode("register")}
            className={`flex-1 text-sm font-body font-semibold py-1.5 rounded-full transition-all ${mode === "register" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
          >
            Join Free
          </button>
          <button
            onClick={() => switchMode("login")}
            className={`flex-1 text-sm font-body font-semibold py-1.5 rounded-full transition-all ${mode === "login" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
          >
            Log In
          </button>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-xs font-body text-destructive mb-4">
          {error}
        </div>
      )}

      {/* OTP step */}
      {mode === "otp" && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="text-center mb-2">
            <p className="font-heading font-semibold text-base">Check your email 📬</p>
            <p className="font-body text-xs text-muted-foreground mt-1">We sent a code to <strong>{email}</strong></p>
          </div>
          <Input
            required
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="Enter verification code"
            className="font-body bg-muted border-0 text-center text-lg tracking-widest"
          />
          <Button type="submit" disabled={loading} className="w-full font-body font-semibold">
            {loading ? "Verifying..." : "Verify & Enter 🤙"}
          </Button>
          <button type="button" onClick={() => base44.auth.resendOtp(email).catch(() => {})}
            className="w-full text-center font-body text-xs text-muted-foreground hover:text-primary transition-colors">
            Didn't get a code? Resend
          </button>
        </form>
      )}

      {/* Register */}
      {mode === "register" && (
        <>
          <form onSubmit={handleRegister} className="space-y-3">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com" className="font-body bg-muted border-0" />
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" className="font-body bg-muted border-0" />
            <Input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password" className="font-body bg-muted border-0" />
            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-0.5 accent-primary" />
              <span className="font-body text-xs text-muted-foreground leading-relaxed">
                I agree to the{" "}
                <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms</Link>
                {" "}and{" "}
                <Link to="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>
              </span>
            </label>
            <Button type="submit" disabled={loading || !agreedToTerms} className="w-full font-body font-semibold">
              {loading ? "Creating account..." : "Join the Block 🤙"}
            </Button>
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-3 text-xs font-body text-muted-foreground">or</span></div>
          </div>
          <Button variant="outline" onClick={handleGoogle} className="w-full gap-2 font-body">
            <GoogleIcon /> Continue with Google
          </Button>
        </>
      )}

      {/* Login */}
      {mode === "login" && (
        <>
          <form onSubmit={handleLogin} className="space-y-3">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com" className="font-body bg-muted border-0" />
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" className="font-body bg-muted border-0" />
            <div className="text-right">
              <Link to="/forgot-password" className="font-body text-xs text-primary hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" disabled={loading} className="w-full font-body font-semibold">
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-3 text-xs font-body text-muted-foreground">or</span></div>
          </div>
          <Button variant="outline" onClick={handleGoogle} className="w-full gap-2 font-body">
            <GoogleIcon /> Continue with Google
          </Button>
        </>
      )}
    </div>
  );
}