import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";
import { DEMO_CHATS, DEMO_MESSAGES } from "@/lib/demoData";
import { useToast } from "@/components/ui/use-toast";

export default function Messages() {
  const [activeChat, setActiveChat] = useState(null);
  const { toast } = useToast();

  const handleVibeCheck = () => {
    const vibes = [
      "🧼 Fresh energy detected!",
      "🌲 Earthy undertones vibing hard",
      "🔥 Spicy! Handle with care",
      "💨 Questionable... but confident",
      "✨ Immaculate aura right now",
      "🧀 Bold. Very bold.",
    ];
    const randomVibe = vibes[Math.floor(Math.random() * vibes.length)];
    toast({
      title: "🤙 Vibe Check Result",
      description: randomVibe,
    });
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)]">
      <div className="flex h-full border-x border-border">
        {/* Chat list sidebar */}
        <div className={`w-full md:w-80 border-r border-border flex flex-col ${activeChat ? "hidden md:flex" : "flex"}`}>
          <div className="px-4 py-4 border-b border-border">
            <h1 className="font-heading text-xl font-bold">Messages</h1>
            <p className="font-body text-xs text-muted-foreground mt-0.5">Your recent whiffs 💨</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <ChatList chats={DEMO_CHATS} activeChat={activeChat} onSelect={setActiveChat} />
          </div>
        </div>

        {/* Chat window */}
        <div className={`flex-1 flex flex-col min-h-0 ${!activeChat ? "hidden md:flex" : "flex"}`}>
          {activeChat && (
            <div className="md:hidden px-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveChat(null)} className="gap-1 font-body">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
          )}
          <ChatWindow
            chat={activeChat}
            messages={activeChat ? DEMO_MESSAGES[activeChat.id] || [] : []}
            onVibeCheck={handleVibeCheck}
          />
        </div>
      </div>
    </div>
  );
}