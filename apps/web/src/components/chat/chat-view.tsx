import { ChatHeader } from "./chat-header";
import { ChatSidebar } from "./chat-sidebar";
import { ConversationPanel } from "./conversation-panel";
import { EmptyChat } from "./empty-chat";
import { GuestBanner } from "./guest-banner";
import { SourcesRail } from "./sources-rail";
import { useChatController } from "./use-chat-controller";

export function ChatView() {
  const chat = useChatController();

  if (!chat.activeConversation) {
    return (
      <div className="flex h-svh bg-[#fafafb] font-sans text-[#14171f] antialiased">
        <ChatSidebar chat={chat} />
        <main
          aria-label="No chat selected"
          className="flex min-w-0 flex-1 flex-col"
        />
      </div>
    );
  }

  return (
    <div className="flex h-svh bg-[#fafafb] font-sans text-[#14171f] antialiased">
      <ChatSidebar chat={chat} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          conversation={chat.activeConversation}
          infoOpen={chat.infoOpen}
          role={chat.role}
          onInfoOpenChange={chat.setInfoOpen}
          onRoleChange={chat.setRole}
        />
        {chat.role === "guest" ? (
          <GuestBanner
            text={chat.guestBannerText}
            onUpgrade={() => chat.setRole("standard")}
          />
        ) : null}
        <div className="flex min-h-0 flex-1">
          {chat.hasMessages ? (
            <ConversationPanel
              conversation={chat.activeConversation}
              input={chat.input}
              isSearching={chat.isSearching}
              scrollRef={chat.scrollRef}
              onInputChange={chat.setInput}
              onSend={() => chat.sendText()}
            />
          ) : (
            <EmptyChat
              input={chat.input}
              isSearching={chat.isSearching}
              onInputChange={chat.setInput}
              onSend={chat.sendText}
            />
          )}
          {chat.hasMessages ? (
            <SourcesRail message={chat.lastCitedMessage} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
