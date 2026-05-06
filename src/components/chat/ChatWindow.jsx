import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ShieldAlert, Ban, Smile, Image as ImageIcon, Loader } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

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

export default function ChatWindow({ me, conversation, messages, onVibeCheck, onMessageSent }) {
  const [input, setInput] = useState("");
  const [stickersOpen, setStickersOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content, isSticker = false, mediaUrl = null, mediaType = null) => {
    if (!content.trim() || !me || !conversation) return;
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
    
    // Trigger notification for receiver
    await base44.functions.invoke('createMessageNotification', {
      message_id: msg.id,
      sender_email: me.email,
      sender_name: conversation.partnerProfile?.display_name || me.full_name,
      sender_avatar: conversation.partnerProfile?.avatar_url,
      receiver_email: conversation.partnerEmail,
    }).catch(() => {});
    
    setInput("");
    setStickersOpen(false);
    setSending(false);
    onMessageSent?.();
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const isVideo = file.type.startsWith("video/");
      const message = isVideo ? "🎥 Sent a video" : "📸 Sent a photo";
      await sendMessage(message, false, file_url, isVideo ? "video" : "image");
    } catch {
      toast({ title: "Upload failed", description: "Couldn't upload file." });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendSticker = (sticker) => sendMessage(`${sticker.emoji} ${sticker.label}`, true);

  const profile = conversation?.partnerProfile;
  const partnerName = profile?.display_name || conversation?.partnerEmail || "";

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <p className="text-5xl mb-3 select-none">💬</p>
          <p className="font-heading text-lg font-semibold">Pick a chat</p>
          <p className="font-body text-sm text-muted-foreground">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
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
            {profile?.is_online && (
              <span className="text-xs text-green-400 font-body">Online</span>
            )}
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
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="font-body text-sm">No messages yet. Say hi! 👋</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_email === me?.email;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
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
                <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {format(new Date(msg.created_date), "h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-muted/30">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-body text-muted-foreground hover:text-destructive gap-1"
            onClick={() => toast({ title: "User blocked", description: `${partnerName} has been blocked.` })}>
            <Ban className="w-3 h-3" /> Block
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-body text-muted-foreground hover:text-destructive gap-1"
            onClick={() => toast({ title: "Report submitted", description: "Thank you for keeping Stinkrz safe." })}>
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
            onChange={(e) => setInput(e.target.value)}
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