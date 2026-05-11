import React, { useState, useEffect } from "react";
import { ArrowLeft, PenSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

import { useLocation } from "react-router-dom";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";
import { useToast } from "@/components/ui/use-toast";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";

export default function Messages() {
  const [activeConversation, setActiveConversation] = useState(null); // { partnerEmail, partnerProfile }
  const [me, setMe] = useState(null);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const { isBlocked } = useBlockedUsers();

  // Auto-open conversation if navigated from profile drawer
  useEffect(() => {
    const profile = location.state?.openConversationWith;
    if (profile) {
      setActiveConversation({ partnerEmail: profile.user_email, partnerProfile: profile });
      // Clear state so back navigation doesn't re-open
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  useEffect(() => {
    base44.auth.me().then(setMe);
  }, []);

  // Real-time messages via subscribe + fallback polling
  const [allMessages, setAllMessages] = useState([]);

  useEffect(() => {
    if (!me?.email) return;
    // Initial load
    base44.entities.ChatMessage.list("-created_date", 50).then(setAllMessages);
    // Real-time subscription
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === "create") {
        const msg = event.data;
        if (msg.sender_email === me.email || msg.receiver_email === me.email) {
          setAllMessages(prev => [msg, ...prev].slice(0, 50));
        }
      } else if (event.type === "update") {
        setAllMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
      } else if (event.type === "delete") {
        setAllMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return unsub;
  }, [me?.email]);

  const refetch = () => base44.entities.ChatMessage.list("-created_date", 50).then(setAllMessages);

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

  const conversations = Object.values(conversationMap)
    .filter(c => !isBlocked(c.partnerEmail))
    .map(c => ({
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

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (!activeConversation || !me?.email) return;
    allMessages
      .filter(m => m.receiver_email === me.email && m.sender_email === activeConversation.partnerEmail && !m.read)
      .forEach(m => base44.entities.ChatMessage.update(m.id, { read: true }));
  }, [activeConversation?.partnerEmail, allMessages]);

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
          <div className="px-4 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h1 className="font-heading text-xl font-bold">Messages</h1>
              <p className="font-body text-xs text-muted-foreground mt-0.5">Your recent whiffs 💨</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setShowNewMsg(true)} title="New message">
              <PenSquare className="w-4 h-4" />
            </Button>
          </div>

          {/* New Message picker */}
          {showNewMsg && (
            <div className="border-b border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-body text-xs font-semibold text-muted-foreground">Start a new chat</p>
                <button onClick={() => setShowNewMsg(false)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {allProfiles
                  .filter(p => p.user_email !== me?.email)
                  .map(profile => (
                    <button
                      key={profile.user_email}
                      onClick={() => {
                        setActiveConversation({ partnerEmail: profile.user_email, partnerProfile: profile });
                        setShowNewMsg(false);
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                        {profile.avatar_url
                          ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-sm">🤙</span>}
                      </div>
                      <span className="font-body text-sm">{profile.display_name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
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