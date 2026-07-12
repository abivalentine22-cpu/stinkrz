import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useChatSounds } from "@/hooks/useChatSounds";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import { useChatAutoScroll } from "@/hooks/useChatAutoScroll";
import { useChat } from "@/hooks/useChat";
import ChatHeader from "./ChatHeader";
import ChatEmptyState from "./ChatEmptyState";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import TypingDots from "./TypingDots";

export default function ChatWindow({ me, conversation, messages, onVibeCheck, onMessageSent }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { blockUser } = useBlockedUsers();
  const partnerName = conversation?.partnerProfile?.display_name || conversation?.partnerEmail || "";
  const { isPartnerTyping, broadcastTyping } = useTypingIndicator(me?.email, conversation?.partnerEmail);
  const { playSend, playReceive, playReaction } = useChatSounds();
  const { reactions, toggleReaction } = useMessageReactions(messages, me?.email);

  const {
    input,
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
  } = useChat({ me, conversation, onMessageSent, playSend, broadcastTyping });

  const { scrollRef, showScrollDown, scrollToBottom } = useChatAutoScroll({
    messages,
    myEmail: me?.email,
    onReceiveSound: playReceive,
    conversationKey: conversation?.partnerEmail,
  });

  const [blockConfirm, setBlockConfirm] = useState(false);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);

  const hideReadReceipts = localStorage.getItem("stinkrz_hide_read_receipts") === "true";

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

  const handleReactionClick = async (msgId, emoji) => {
    playReaction();
    setReactionPickerMsgId(null);
    await toggleReaction(msgId, emoji);
  };

  const onTogglePicker = (msgId) => setReactionPickerMsgId(prev => (prev === msgId ? null : msgId));
  const onClosePicker = () => setReactionPickerMsgId(null);

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

  const onSend = () => sendMessage(input);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <ChatHeader
        profile={profile}
        partnerName={partnerName}
        isPartnerTyping={isPartnerTyping}
        onVibeCheck={onVibeCheck}
      />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <ChatEmptyState partnerName={partnerName} onSendMessage={sendMessage} />
        )}

        {displayMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            me={me}
            reactions={reactions}
            activePickerMsgId={reactionPickerMsgId}
            hideReadReceipts={hideReadReceipts}
            onTogglePicker={onTogglePicker}
            onClosePicker={onClosePicker}
            onReact={handleReactionClick}
          />
        ))}

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

      <ChatInput
        input={input}
        onInputChange={handleInputChange}
        onSend={onSend}
        sending={sending}
        stickersOpen={stickersOpen}
        setStickersOpen={setStickersOpen}
        onSendSticker={sendSticker}
        uploading={uploading}
        fileInputRef={fileInputRef}
        onMediaUpload={handleMediaUpload}
        blockConfirm={blockConfirm}
        onBlock={handleBlock}
        onReport={() => navigate("/report", { state: { reportedName: profile?.display_name || conversation?.partnerEmail, reportedEmail: conversation?.partnerEmail } })}
      />
    </div>
  );
}