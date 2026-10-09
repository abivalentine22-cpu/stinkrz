import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Owns the chat send pipeline: input state, optimistic messages, sending a
 * message (text / sticker / media), image compression, media upload + size
 * validation, and firing the message-notification backend function.
 */
export function useChat({ me, conversation, onMessageSent, playSend, broadcastTyping }) {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [stickersOpen, setStickersOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [optimisticMsgs, setOptimisticMsgs] = useState([]);
  const fileInputRef = useRef(null);
  const sendingRef = useRef(false);
  const partnerEmailRef = useRef(conversation?.partnerEmail);
  partnerEmailRef.current = conversation?.partnerEmail;

  const sendMessage = async (content, isSticker = false, mediaUrl = null, mediaType = null) => {
    const recipient = conversation?.partnerEmail;
    if (!content?.trim() || !me?.email || !recipient || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);

    const optimisticId = `opt-${crypto.randomUUID()}`;
    const payload = {
      sender_email: me.email, receiver_email: recipient,
      content, is_sticker: isSticker, read: false,
      ...(mediaUrl ? { media_url: mediaUrl, media_type: mediaType } : {}),
    };
    setOptimisticMsgs(prev => [...prev, {
      ...payload, id: optimisticId,
      created_date: new Date().toISOString(), _optimistic: true,
    }]);
    if (!isSticker && !mediaUrl) setInput("");
    setStickersOpen(false);
    playSend();

    try {
      let msg;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          msg = await base44.entities.ChatMessage.create(payload);
          break;
        } catch (error) {
          const status = error?.response?.status ?? error?.status;
          if (status !== 429 || attempt === 2) throw error;
          await new Promise(resolve => setTimeout(resolve, 1500 * 2 ** attempt));
        }
      }
      // Insert the saved message before removing its pending bubble, without
      // waiting for the next gateway refresh to show that it was sent.
      onMessageSent?.(msg);
      base44.functions.invoke('createMessageNotification', { message_id: msg.id }).catch(() => {});
    } catch (error) {
      if (!isSticker && !mediaUrl && partnerEmailRef.current === recipient) {
        setInput(draft => draft || content);
      }
      toast({ title: "Message wasn't sent", description: error?.response?.data?.error || error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setOptimisticMsgs(prev => prev.filter(m => m.id !== optimisticId));
      sendingRef.current = false;
      setSending(false);
    }
  };

  const compressImage = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxSize = 1280;
          let { width, height } = img;
          if (width > height) {
            if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
          } else {
            if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(new File([blob], "photo.jpg", { type: "image/jpeg" })), "image/jpeg", 0.85);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: `Max size is ${isVideo ? "50MB for videos" : "10MB for images"}.`, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const recipient = conversation?.partnerEmail;
    if (!me?.email || !recipient || uploading || sendingRef.current) return;
    setUploading(true);
    try {
      const uploadFile = isVideo ? file : await compressImage(file);
      const result = await base44.functions.invoke('private-chat-media', { file: uploadFile, receiver_email: recipient });
      const msg = result.data?.message;
      if (!msg?.id) throw new Error("Upload could not be saved.");
      if (partnerEmailRef.current === recipient) onMessageSent?.(msg);
      playSend();
      base44.functions.invoke('createMessageNotification', { message_id: msg.id }).catch(() => {});

    } catch (err) {
      toast({ title: "Upload failed", description: err?.message || "Couldn't upload file. Try a smaller file.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendSticker = (sticker) => sendMessage(`${sticker.emoji} ${sticker.label}`, true);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (e.target.value.trim()) broadcastTyping();
  };

  // Clear optimistic messages on conversation switch
  useEffect(() => {
    setOptimisticMsgs([]);
  }, [conversation?.partnerEmail]);

  return {
    input,
    setInput,
    stickersOpen,
    setStickersOpen,
    sending,
    uploading,
    optimisticMsgs,
    fileInputRef,
    sendMessage,
    sendSticker,
    handleInputChange,
    handleMediaUpload,
  };
}