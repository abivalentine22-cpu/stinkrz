import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";
import { useToast } from "@/components/ui/use-toast";

export default function Messages() {
  const [activeConversation, setActiveConversation] = useState(null); // { partnerEmail, partnerProfile }
  const [me, setMe] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(setMe);
  }, []);

  // Fetch all messages involving the current user
  const { data: allMessages = [], refetch } = useQuery({
    queryKey: ["chat-messages", me?.email],
    queryFn: () => base44.entities.ChatMessage.list("-created_date", 200),
    enabled: !!me?.email,
    refetchInterval: 5000,
  });

  // Fetch all scent profiles for partner info
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: () => base44.entities.ScentProfile.list(),
    enabled: !!me?.email,
  });

  const getProfile = (email) => allProfiles.find(p => p.user_email === email);

  // Build conversation list: unique partners from messages to/from me
  const myMessages = allMessages.filter(
    m => m.sender_email === me?.email || m.receiver_email === me?.email
  );

  const conversationMap = {};
  myMessages.forEach(msg => {
    const partnerEmail = msg.sender_email === me?.email ? msg.receiver_email : msg.sender_email;
    if (!conversationMap[partnerEmail]) {
      conversationMap[partnerEmail] = { partnerEmail, lastMessage: msg, unread: 0 };
    }
    if (msg.sender_email !== me?.email && !msg.read) {
      conversationMap[partnerEmail].unread += 1;
    }
  });

  const conversations = Object.values(conversationMap).map(c => ({
    ...c,
    partnerProfile: getProfile(c.partnerEmail),
  }));

  const activeMessages = activeConversation
    ? myMessages.filter(
        m =>
          (m.sender_email === me?.email && m.receiver_email === activeConversation.partnerEmail) ||
          (m.receiver_email === me?.email && m.sender_email === activeConversation.partnerEmail)
      ).reverse()
    : [];

  const handleVibeCheck = () => {
    const vibes = [
      "🧼 Fresh energy detected!",
      "🌲 Earthy undertones vibing hard",
      "🔥 Spicy! Handle with care",
      "💨 Questionable... but confident",
      "✨ Immaculate aura right now",
      "🧀 Bold. Very bold.",
    ];
    toast({
      title: "🤙 Vibe Check Result",
      description: vibes[Math.floor(Math.random() * vibes.length)],
    });
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)]">
      <div className="flex h-full border-x border-border">
        {/* Sidebar */}
        <div className={`w-full md:w-80 border-r border-border flex flex-col ${activeConversation ? "hidden md:flex" : "flex"}`}>
          <div className="px-4 py-4 border-b border-border">
            <h1 className="font-heading text-xl font-bold">Messages</h1>
            <p className="font-body text-xs text-muted-foreground mt-0.5">Your recent whiffs 💨</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                <p className="text-4xl mb-3">💨</p>
                <p className="font-body text-sm">No messages yet. Send a whiff from the map!</p>
              </div>
            ) : (
              <ChatList
                conversations={conversations}
                activeConversation={activeConversation}
                onSelect={setActiveConversation}
              />
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className={`flex-1 flex flex-col min-h-0 ${!activeConversation ? "hidden md:flex" : "flex"}`}>
          {activeConversation && (
            <div className="md:hidden px-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveConversation(null)} className="gap-1 font-body">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
          )}
          <ChatWindow
            me={me}
            conversation={activeConversation}
            messages={activeMessages}
            onVibeCheck={handleVibeCheck}
            onMessageSent={refetch}
          />
        </div>
      </div>
    </div>
  );
}