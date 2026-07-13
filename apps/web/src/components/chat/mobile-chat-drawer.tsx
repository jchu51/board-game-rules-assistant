import { BookOpen, Plus, X } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";

import { ChatNavigationContent } from "./chat-navigation-content";
import type { ChatController } from "./use-chat-controller";

export function MobileChatDrawer(props: {
  chat: ChatController;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
}) {
  const { chat, menuButtonRef, open, onClose } = props;
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuButtonRef, onClose, open]);

  if (!open) return null;

  const closeNavigation = () => {
    onClose();
    menuButtonRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        id="mobile-chat-backdrop-btn"
        data-testid="mobile-chat-backdrop-btn"
        type="button"
        aria-label="Close chat navigation"
        className="absolute inset-0 size-full cursor-default bg-[#14171f]/35"
        onClick={closeNavigation}
      />
      <aside
        id="mobile-chat-navigation"
        role="dialog"
        aria-label="Chat navigation"
        aria-modal="true"
        className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-white px-3 py-4 shadow-2xl"
      >
        <div className="flex items-center gap-2.5 px-2 pt-1 pb-3.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#6d5ef0,#3fbfa8)] text-white">
            <BookOpen className="size-4" aria-hidden="true" />
          </div>
          <span className="font-heading flex-1 text-[15px] font-bold text-[#14171f]">
            Rulebook Referee
          </span>
          <button
            ref={closeButtonRef}
            id="mobile-chat-close-btn"
            data-testid="mobile-chat-close-btn"
            type="button"
            aria-label="Close chat navigation"
            className="flex size-9 items-center justify-center rounded-[10px] text-[#5b5648] outline-none hover:bg-[#f8f6ff] focus-visible:ring-2 focus-visible:ring-[#6d5ef0]"
            onClick={closeNavigation}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <button
          id="mobile-new-chat-btn"
          data-testid="mobile-new-chat-btn"
          type="button"
          disabled={chat.isCreatingChat}
          className="mb-3.5 flex h-10 items-center gap-2 rounded-xl border border-[#edeae3] bg-[#f8f6ff] px-3.5 text-[13.5px] font-semibold text-[#6d5ef0] outline-none hover:bg-[#efebfc] focus-visible:ring-2 focus-visible:ring-[#6d5ef0] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={async () => {
            await chat.handleNewChat();
            closeNavigation();
          }}
        >
          <Plus className="size-[15px]" aria-hidden="true" />
          New chat
        </button>
        <ChatNavigationContent
          chat={chat}
          idPrefix="mobile-chat"
          onNavigate={closeNavigation}
        />
      </aside>
    </div>
  );
}
