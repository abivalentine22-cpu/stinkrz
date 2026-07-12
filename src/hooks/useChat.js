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

  const sendMessage = async (content, isSticker = false, mediaUrl = null, mediaType = null) => {
    if (!content?.trim() || !me || !conversation) return;

    const optimisticId = `opt-${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      sender_email: me.email,
      receiver_email: conversation.partnerEmail,
      content,
      is_sticker: isSticker,
      media_url: mediaUrl,
      media_type: mediaType,
      read: false,
      created_date: new Date().toISOString(),
      _optimistic: true,
    };
    setOptimisticMsgs(prev => [...prev, optimistic]);
    setInput("");
    setStickersOpen(false);
    playSend();

    setSending(true);
    const msg = await base44.entities.ChatMessage.create({
      sender_email: me.email,
      receiver_email: conversation.partnerEmail,
      content,
      is_sticker: isSticker,
      media_url: mediaUrl,
      media_type: mediaType,
      read: false,
    });
    setOptimisticMsgs(prev => prev.filter(m => m.id !== optimisticId));
    setSending(false);

    base44.functions.invoke('createMessageNotification', {
      message_id: msg.id,
      sender_email: me.email,
      sender_name: me.full_name,
      sender_avatar: conversation.partnerProfile?.avatar_url,
      receiver_email: conversation.partnerEmail,
    }).catch(() => {});

    onMessageSent?.();
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

    setUploading(true);
    try {
      const uploadFile = isVideo ? file : await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFile });
      const message = isVideo ? "🎥 Sent a video" : "📸 Sent a photo";
      await sendMessage(message, false, file_url, isVideo ? "video" : "image");
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