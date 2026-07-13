import { Menu } from "lucide-react";
import type { RefObject } from "react";

import type { ChatController } from "./use-chat-controller";

export function MobileChatHeader(props: {
  chat: ChatController;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  navigationOpen: boolean;
  onMenuClick: () => void;
}) {
  const { chat, menuButtonRef, navigationOpen, onMenuClick } = props;
  return (
    <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-[#edeae3] bg-white px-4 md:hidden">
      <button
        ref={menuButtonRef}
        id="mobile-chat-menu-btn"
        data-testid="mobile-chat-menu-btn"
        type="button"
        aria-label="Open chat navigation"
        aria-controls="mobile-chat-navigation"
        aria-expanded={navigationOpen}
        className="flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-[#edeae3] bg-white text-[#14171f] outline-none hover:bg-[#f8f6ff] focus-visible:ring-2 focus-visible:ring-[#6d5ef0]"
        onClick={onMenuClick}
      >
        <Menu className="size-4" aria-hidden="true" />
      </button>
      <span className="font-heading min-w-0 flex-1 truncate text-base font-bold text-[#14171f]">
        {chat.activeConversation?.title ?? "Chat"}
      </span>
    </header>
  );
}
