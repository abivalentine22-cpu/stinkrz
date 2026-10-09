import React, { useEffect, useState, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { getProfileDiagnostics, subscribeProfileDiagnostics } from "@/lib/profileDiagnostics";
const seconds = ms => Number.isFinite(ms) ? (ms / 1000).toFixed(2) + "s" : "—";

export default function ProfileDiagnostics() {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const entries = useSyncExternalStore(subscribeProfileDiagnostics, getProfileDiagnostics);
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open]);
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild>
      <button className="absolute right-4 top-16 rounded-lg bg-background/95 border border-primary/30 px-3 py-2 text-xs text-primary" style={{ zIndex: 1200 }}>Loading diagnostics</button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(0,0,0,.7)" }} />
      <Dialog.Content className="fixed left-1/2 top-1/2 w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-primary/30 bg-background p-5 text-foreground shadow-xl" style={{ zIndex: 2101 }}>
        <Dialog.Title className="text-lg font-bold pr-8">Profile loading diagnostics</Dialog.Title>
        <Dialog.Description className="text-xs text-muted-foreground mt-2">Latest requests in this session. Times measure requests, not map rendering. Server timings appear after a response arrives.</Dialog.Description>
        <Dialog.Close aria-label="Close diagnostics" className="absolute right-4 top-4 p-1">✕</Dialog.Close>
        <div className="mt-4 max-h-[65vh] overflow-y-auto space-y-3">
          {!entries.length && <p className="text-sm">No profile requests yet.</p>}
          {[...entries].reverse().slice(0, 8).map(entry => <div key={entry.id} className="rounded-lg border border-primary/20 p-3 text-xs space-y-2">
            <p className="font-semibold">#{entry.id} {entry.kind} · {entry.state}</p>
            <p>Total: {seconds(entry.duration ?? Math.max(0, now - entry.started))} · HTTP: {entry.status || "—"}</p>
            <p>Other reads at start: {entry.activeReads} · Shared callers: {entry.shared}</p>
            {entry.server ? <>
              <p>Server: {seconds(entry.server.total)} · Auth: {seconds(entry.server.authentication)}</p>
              <p>Permissions: {seconds(entry.server.permissions)} · Profiles: {seconds(entry.server.records)} · Filtering: {seconds(entry.server.filter)}</p>
              <p className="break-all text-muted-foreground">Request: {entry.server.requestId}</p>
            </> : <p className="text-muted-foreground">Server timings unavailable until the request completes.</p>}
          </div>)}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
