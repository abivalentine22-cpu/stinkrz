import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ShieldAlert, Ban, Smile, Image as ImageIcon, Loader } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SCENT_STICKERS } from "./chatConstants";

export default function ChatInput({
  input,
  onInputChange,
  onSend,
  sending,
  stickersOpen,
  setStickersOpen,
  onSendSticker,
  uploading,
  fileInputRef,
  onMediaUpload,
  blockConfirm,
  onBlock,
  onReport,
}) {
  return (
    <div className="border-t border-border bg-card/80">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-muted/30">
        <Button variant="ghost" size="sm"
          className={`h-7 px-2 text-xs font-body gap-1 transition-colors ${blockConfirm ? "text-destructive border border-destructive/40" : "text-muted-foreground hover:text-destructive"}`}
          onClick={onBlock}>
          <Ban className="w-3 h-3" /> {blockConfirm ? "Tap again to confirm" : "Block"}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-body text-muted-foreground hover:text-destructive gap-1"
          onClick={onReport}>
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
                <button key={sticker.id} onClick={() => onSendSticker(sticker)}
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
          onChange={onMediaUpload}
          className="hidden"
          disabled={uploading}
        />

        <Input
          value={input}
          onChange={onInputChange}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="Send a whiff..."
          className="flex-1 font-body bg-muted border-0 focus-visible:ring-1"
        />
        <Button size="icon" onClick={onSend} disabled={!input.trim() || sending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}