import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ShieldAlert, Ban, Smile, Image as ImageIcon, Loader, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useChatSounds } from "@/hooks/useChatSounds";
import { useMessageReactions } from "@/hooks/useMessageReactions";

const SCENT_STICKERS = [
  { id: "s1", emoji: "🧼", label: "Fresh & Clean" },
  { id: "s2", emoji: "🌸", label: "Floral Vibes" },
  { id: "s3", emoji: "🔥", label: "Hot Stuff" },
  { id: "s4", emoji: "💨", label: "Wind Check" },
  { id: "s5", emoji: "🧀", label: "Cheesy" },
  { id: "s6", emoji: "🌲", label: "Pine Fresh" },
  { id: "s7", emoji: "🍋", label: "Citrus Pop" },
  { id: "s8", emoji: "💀", label: "RIP Noses" },
  { id: "s9", emoji: "👃", label: "Nose Approved" },
  { id: "s10", emoji: "🤙", label: "Hang Loose" },
  { id: "s11", emoji: "🚿", label: "Shower Time" },
  { id: "s12", emoji: "✨", label: "Sparkling" },
];

const REACTION_EMOJIS = ["💨", "🤙", "👃", "🔥", "💜", "😂", "❤️", "😮"];

export default function ChatWindow({ me, conversation, messages, onVibeCheck, onMessageSent }) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [stickersOpen, setStickersOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [optimisticMsgs, setOptimisticMsgs] = useState([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const isNearBottomRef = useRef(true);

  const { toast } = useToast();
  const { blockUser } = useBlockedUsers();
  const partnerName = conversation?.partnerProfile?.display_name || conversation?.partnerEmail || "";
  const { isPartnerTyping, broadcastTyping } = useTypingIndicator(me?.email, conversation?.partnerEmail);
  const { playSend, playReceive, playReaction } = useChatSounds();
  const { reactions, toggleReaction } = useMessageReactions(messages, me?.email);

  const hideReadReceipts = localStorage.getItem("stinkrz_hide_read_receipts") === "true";

  // Track scroll position to show/hide jump button
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distFromBottom < 80;
    setShowScrollDown(distFromBottom > 120);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Auto-scroll logic
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isInitialLoad = prevMsgCountRef.current === 0 && messages.length > 0;
    if (isInitialLoad) {
      el.scrollTop = el.scrollHeight;
    } else if (messages.length > prevMsgCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      const isMyMsg = lastMsg?.sender_email === me?.email;
      if (isNearBottomRef.current || isMyMsg) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      } else {
        // New message from partner while scrolled up — show jump button
        setShowScrollDown(true);
        // Play receive sound for incoming messages
        if (!isMyMsg) playReceive();
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  // Clear state on conversation switch
  useEffect(() => {
    setOptimisticMsgs([]);
    setShowScrollDown(false);
    prevMsgCountRef.current = 0;
    isNearBottomRef.current = true;
  }, [conversation?.partnerEmail]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setShowScrollDown(false);
  };

  const handleBlock = () => {
    if (!blockConfirm) {
      setBlockConfirm(true);
      setTimeout(() => setBlockConfirm(false), 3000);
      return;
    }
    blockUser(conversation.partnerEmail);
    toast({ title: `${partnerName} blocked`, description: "You won't see their content anymore." });
    setBlockConfirm(false);
  };

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
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
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

  const handleReactionClick = async (msgId, emoji) => {
    playReaction();
    setReactionPickerMsgId(null);
    await toggleReaction(msgId, emoji);
  };

  const profile = conversation?.partnerProfile;

  const displayMessages = [
    ...messages,
    ...optimisticMsgs.filter(o => !messages.some(m => m.content === o.content && m.sender_email === o.sender_email)),
  ];

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <p className="text-5xl mb-3 select-none">💨</p>
          <p className="font-heading text-lg font-semibold">No chat selected</p>
          <p className="font-body text-sm text-muted-foreground mt-1">Pick a conversation or tap someone on the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-muted">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg">🤙</div>
            )}
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm">{partnerName}</h3>
            {isPartnerTyping ? (
              <span className="text-xs text-primary font-body flex items-center gap-1">
                <TypingDots /> typing…
              </span>
            ) : profile?.is_online ? (
              <span className="text-xs text-green-400 font-body">Online</span>
            ) : null}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onVibeCheck} className="gap-1.5 text-accent hover:text-accent font-body">
          <span className="text-lg">🤙</span>
          Vibe Check
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <span className="text-4xl">👃</span>
            <p className="font-heading text-base font-semibold">{partnerName} is waiting for a whiff</p>
            <p className="font-body text-sm text-muted-foreground max-w-[220px] mb-2">Break the ice with a line:</p>
            <div className="flex flex-col gap-2 w-full max-w-[260px]">
              {[
                `Hey ${partnerName}, your scent profile had me curious 👃`,
                "What's your go-to post-gym ritual? 😅",
                "Hot take: showering daily is overrated. Discuss.",
                "If your scent were a candle, what would it be called?",
              ].map((line) => (
                <button
                  key={line}
                  onClick={() => sendMessage(line)}
                  className="text-left px-3 py-2 rounded-xl bg-primary/10 border border-primary/25 text-primary text-xs font-body hover:bg-primary/20 transition-colors"
                >
                  {line}
                </button>
              ))}
            </div>
          </div>
        )}

        {displayMessages.map((msg) => {
          const isMe = msg.sender_email === me?.email;
          const msgReactions = reactions[msg.id] || [];
          const reactionGroups = msgReactions.reduce((acc, r) => {
            if (!acc[r.emoji]) acc[r.emoji] = [];
            acc[r.emoji].push(r.user_email);
            return acc;
          }, {});
          const showPicker = reactionPickerMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              onMouseLeave={() => setReactionPickerMsgId(null)}
            >
              <div className="relative group">
                {/* Reaction picker trigger */}
                {!msg._optimistic && (
                  <button
                    onClick={() => setReactionPickerMsgId(showPicker ? null : msg.id)}
                    className={`absolute ${isMe ? "-left-7" : "-right-7"} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-base z-10 hover:scale-110`}
                    title="React"
                  >
                    😄
                  </button>
                )}

                {/* Reaction picker dropdown */}
                {showPicker && (
                  <div
                    className={`absolute ${isMe ? "right-full mr-2" : "left-full ml-2"} top-0 z-20 flex gap-1 bg-card border border-border rounded-full px-2 py-1 shadow-lg`}
                    onMouseLeave={() => setReactionPickerMsgId(null)}
                  >
                    {REACTION_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReactionClick(msg.id, emoji)}
                        className="text-lg hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 transition-opacity ${
                  msg._optimistic ? "opacity-60" : "opacity-100"
                } ${
                  msg.is_sticker
                    ? "bg-transparent text-3xl text-center"
                    : isMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}>
                  {msg.media_url && msg.media_type === "image" && (
                    <img src={msg.media_url} alt="shared" className="max-w-full rounded-lg mb-2" />
                  )}
                  {msg.media_url && msg.media_type === "video" && (
                    <video controls className="max-w-full rounded-lg mb-2" style={{ maxHeight: "300px" }}>
                      <source src={msg.media_url} type="video/mp4" />
                    </video>
                  )}
                  <p className={msg.is_sticker ? "text-3xl" : "font-body text-sm"}>{msg.content}</p>
                  <p className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {msg._optimistic
                      ? <><Loader className="w-2.5 h-2.5 animate-spin inline" /> Sending…</>
                      : format(new Date(msg.created_date), "h:mm a")
                    }
                    {isMe && !msg._optimistic && !hideReadReceipts && (
                      <span style={{ fontSize: "10px" }} title={msg.read ? "Read" : "Sent"}>
                        {msg.read ? "✓✓" : "✓"}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Reactions below bubble */}
              {Object.keys(reactionGroups).length > 0 && (
                <div className={`flex gap-1 mt-1 flex-wrap ${isMe ? "justify-end" : "justify-start"}`}>
                  {Object.entries(reactionGroups).map(([emoji, users]) => {
                    const iMine = users.includes(me?.email);
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleReactionClick(msg.id, emoji)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex items-center gap-0.5 ${
                          iMine
                            ? "bg-primary/20 border-primary/40 text-primary"
                            : "bg-muted/60 border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {emoji}{users.length > 1 && <span className="ml-0.5">{users.length}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isPartnerTyping && (
          <div className="flex items-center gap-2">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-1.5">
              <TypingDots />
              <span className="font-body text-xs text-muted-foreground">{partnerName} is typing</span>
            </div>
          </div>
        )}
      </div>

      {/* Jump to bottom button */}
      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-body font-semibold shadow-lg hover:bg-primary/90 transition-colors animate-bounce"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          New messages
        </button>
      )}

      {/* Input */}
      <div className="border-t border-border bg-card/80">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-muted/30">
          <Button variant="ghost" size="sm"
            className={`h-7 px-2 text-xs font-body gap-1 transition-colors ${blockConfirm ? "text-destructive border border-destructive/40" : "text-muted-foreground hover:text-destructive"}`}
            onClick={handleBlock}>
            <Ban className="w-3 h-3" /> {blockConfirm ? "Tap again to confirm" : "Block"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-body text-muted-foreground hover:text-destructive gap-1"
            onClick={() => navigate("/report", { state: { reportedName: profile?.display_name || conversation?.partnerEmail, reportedEmail: conversation?.partnerEmail } })}>
            <ShieldAlert className="w-3 h-3" /> Report
          </Button>
        </div>

        <div className="flex items-center gap-2 px-3 py-3">
          <Popover open={stickersOpen} onOpenChange={setStickersOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Smile className="w-5 h-5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 bg-card border-border p-3" align="start">
              <p className="font-heading text-xs font-semibold mb-2 text-muted-foreground">Scent Stickers</p>
              <div className="grid grid-cols-4 gap-2">
                {SCENT_STICKERS.map((sticker) => (
                  <button key={sticker.id} onClick={() => sendSticker(sticker)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors">
                    <span className="text-2xl">{sticker.emoji}</span>
                    <span className="text-[9px] font-body text-muted-foreground">{sticker.label}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0"
            title="Upload image or video"
          >
            {uploading ? <Loader className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleMediaUpload}
            className="hidden"
            disabled={uploading}
          />

          <Input
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Send a whiff..."
            className="flex-1 font-body bg-muted border-0 focus-visible:ring-1"
          />
          <Button size="icon" onClick={() => sendMessage(input)} disabled={!input.trim() || sending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Animated typing dots
function TypingDots() {
  return (
    <span className="flex gap-0.5 items-center">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary inline-block"
          style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}