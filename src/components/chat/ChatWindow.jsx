import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Send, ShieldAlert, Ban, Smile } from "lucide-react";
import { format } from "date-fns";
import { SCENT_STICKERS } from "@/lib/demoData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";

export default function ChatWindow({ chat, messages: initialMessages, onVibeCheck }) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState("");
  const [stickersOpen, setStickersOpen] = useState(false);
  const scrollRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    setMessages(initialMessages || []);
  }, [initialMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg = {
      id: `m-${Date.now()}`,
      sender: "me",
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
  };

  const sendSticker = (sticker) => {
    const newMsg = {
      id: `m-${Date.now()}`,
      sender: "me",
      content: `${sticker.emoji} ${sticker.label}`,
      timestamp: new Date().toISOString(),
      isSticker: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setStickersOpen(false);
  };

  if (!chat) {
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
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-muted">
            {chat.partner.avatar_url ? (
              <img src={chat.partner.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg">🤙</div>
            )}
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm">{chat.partner.display_name}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 text-primary" />
              <span className="font-body">{chat.partner.distance} mi away</span>
            </div>
          </div>
        </div>
        {/* Vibe check button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onVibeCheck}
          className="gap-1.5 text-accent hover:text-accent font-body"
        >
          <span className="text-lg">🤙</span>
          Vibe Check
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                msg.isSticker
                  ? "bg-transparent text-3xl text-center"
                  : msg.sender === "me"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {!msg.isSticker && <p className="font-body text-sm">{msg.content}</p>}
              {msg.isSticker && <p className="text-3xl">{msg.content}</p>}
              <p className={`text-[10px] mt-1 ${msg.sender === "me" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {format(new Date(msg.timestamp), "h:mm a")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input area with block/report bar */}
      <div className="border-t border-border bg-card/80">
        {/* Block/Report bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-body text-muted-foreground hover:text-destructive gap-1"
            onClick={() => toast({ title: "User blocked", description: `${chat.partner.display_name} has been blocked.` })}
          >
            <Ban className="w-3 h-3" />
            Block
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-body text-muted-foreground hover:text-destructive gap-1"
            onClick={() => toast({ title: "Report submitted", description: "Thank you for keeping Stinkrz safe." })}
          >
            <ShieldAlert className="w-3 h-3" />
            Report
          </Button>
        </div>

        <div className="flex items-center gap-2 px-3 py-3">
          {/* Stickers */}
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
                  <button
                    key={sticker.id}
                    onClick={() => sendSticker(sticker)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <span className="text-2xl">{sticker.emoji}</span>
                    <span className="text-[9px] font-body text-muted-foreground">{sticker.label}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Send a whiff..."
            className="flex-1 font-body bg-muted border-0 focus-visible:ring-1"
          />
          <Button size="icon" onClick={sendMessage} disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}