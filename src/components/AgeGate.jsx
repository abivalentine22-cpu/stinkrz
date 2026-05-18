import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import HangLooseLogo from "@/components/HangLooseLogo";

const KEY = "stinkrz_age_confirmed";

export default function AgeGate({ children }) {
  const [confirmed, setConfirmed] = useState(true); // start true to avoid flash
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ok = localStorage.getItem(KEY) === "yes";
    setConfirmed(ok);
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  if (confirmed) return children;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="flex justify-center mb-6">
          <HangLooseLogo size={48} />
        </div>
        <h1 className="font-heading text-3xl font-bold mb-2">Hold up 🤙</h1>
        <p className="font-body text-muted-foreground mb-8 leading-relaxed">
          Stinkrz is an adult platform. You must be <strong className="text-foreground">18 or older</strong> to enter.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full font-body font-semibold text-base"
            onClick={() => {
              localStorage.setItem(KEY, "yes");
              setConfirmed(true);
            }}
          >
            I'm 18 or older — Let me in
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full font-body text-muted-foreground"
            onClick={() => window.location.href = "https://www.google.com"}
          >
            I'm under 18 — Exit
          </Button>
        </div>
        <p className="font-body text-xs text-muted-foreground mt-6">
          By entering you agree to our{" "}
          <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>{" "}
          and confirm you are of legal age.
        </p>
      </div>
    </div>
  );
}