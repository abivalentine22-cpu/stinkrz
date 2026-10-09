import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function PrivateMedia({ messageId, mediaType, userEmail }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setUrl(null);
    setError("");
    setLoading(false);
  }, [messageId, userEmail]);
  useEffect(() => {
    if (!url) return;
    const timer = setTimeout(() => setUrl(null), 290_000);
    return () => clearTimeout(timer);
  }, [url]);
  const openMedia = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await base44.functions.invoke("private-chat-media", { message_id: messageId });
      if (!result.data?.signed_url) throw new Error("Attachment unavailable");
      setUrl(result.data.signed_url);
    } catch {
      setError("Couldn't open this attachment. Try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="mb-2">
      {url ? (
        mediaType === "video"
          ? <video src={url} controls preload="metadata" className="max-w-full rounded-lg" style={{ maxHeight: "300px" }} onError={() => { setUrl(null); setError("Attachment expired or unavailable. Open it again."); }} />
          : <img src={url} alt="Private attachment" className="max-w-full rounded-lg" onError={() => { setUrl(null); setError("Attachment expired or unavailable. Open it again."); }} />
      ) : (
        <button type="button" disabled={loading} onClick={openMedia} className="rounded-lg border border-current/30 px-3 py-2 text-sm">
          {loading ? "Opening…" : mediaType === "video" ? "Open private video" : "Open private photo"}
        </button>
      )}
      {error && <p role="status" className="text-xs mt-1">{error}</p>}
    </div>
  );
}
