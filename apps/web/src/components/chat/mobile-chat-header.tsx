import { BookOpen, Menu, Plus } from "lucide-react";
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
    <header className="flex h-[58px] shrink-0 items-center gap-2 border-b border-[#f0edfb] bg-white px-3 md:hidden">
      <div className="mr-auto flex min-w-0 items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#7b2ff7,#00c4cc)] text-white">
          <BookOpen className="size-4" aria-hidden="true" />
        </div>
        <span className="font-heading truncate text-sm font-bold text-[#14171f]">
          Rulebook Referee
        </span>
      </div>
      <button
        id="mobile-new-chat-btn"
        data-testid="mobile-new-chat-btn"
        type="button"
        disabled={chat.isCreatingChat}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] border border-[#edeafb] bg-[#f7f5ff] px-3 text-xs font-semibold text-[#7b2ff7] outline-none focus-visible:ring-2 focus-visible:ring-[#7b2ff7] disabled:cursor-not-allowed disabled:opacity-60"
        onClick={chat.handleNewChat}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        New chat
      </button>
      <button
        ref={menuButtonRef}
        id="mobile-chat-menu-btn"
        data-testid="mobile-chat-menu-btn"
        type="button"
        aria-label="Open chat navigation"
        aria-controls="mobile-chat-navigation"
        aria-expanded={navigationOpen}
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#edeafb] bg-white text-[#5e6572] outline-none focus-visible:ring-2 focus-visible:ring-[#7b2ff7]"
        onClick={onMenuClick}
      >
        <Menu className="size-4" aria-hidden="true" />
      </button>
    </header>
  );
}
