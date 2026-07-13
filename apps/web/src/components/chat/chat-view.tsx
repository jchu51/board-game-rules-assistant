import { useCallback, useRef, useState } from "react";

import { ChatHeader } from "./chat-header";
import { ChatSidebar } from "./chat-sidebar";
import { ConversationPanel } from "./conversation-panel";
import { EmptyChat } from "./empty-chat";
import { GuestBanner } from "./guest-banner";
import { MobileChatDrawer } from "./mobile-chat-drawer";
import { MobileChatHeader } from "./mobile-chat-header";
import { SourcesRail } from "./sources-rail";
import { useChatController } from "./use-chat-controller";

export function ChatView() {
  const chat = useChatController();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const openMobileNavigation = useCallback(
    () => setMobileNavigationOpen(true),
    [],
  );
  const closeMobileNavigation = useCallback(
    () => setMobileNavigationOpen(false),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 bg-[#fcfbfa] font-sans text-[#14171f] antialiased">
      <ChatSidebar chat={chat} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileChatHeader
          chat={chat}
          menuButtonRef={mobileMenuButtonRef}
          navigationOpen={mobileNavigationOpen}
          onMenuClick={openMobileNavigation}
        />
        {chat.chatError ? (
          <p
            role="alert"
            className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700"
          >
            {chat.chatError}
          </p>
        ) : null}
        {chat.activeConversation ? (
          <>
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
          </>
        ) : (
          <main
            aria-label="No chat selected"
            className="flex min-w-0 flex-1 flex-col items-center justify-center px-6 text-center"
          >
            <p className="max-w-sm text-sm leading-6 text-[#b8b2a6]">
              Create a new chat from the chat list to ask a rulebook question.
            </p>
          </main>
        )}
      </div>
      <MobileChatDrawer
        chat={chat}
        menuButtonRef={mobileMenuButtonRef}
        open={mobileNavigationOpen}
        onClose={closeMobileNavigation}
      />
    </div>
  );
}
