import { BookOpen, X } from "lucide-react";
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
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#7b2ff7,#00c4cc)] text-white">
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
            className="flex size-9 items-center justify-center rounded-[10px] text-[#5e6572] outline-none hover:bg-[#f7f5ff] focus-visible:ring-2 focus-visible:ring-[#7b2ff7]"
            onClick={closeNavigation}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <ChatNavigationContent
          chat={chat}
          idPrefix="mobile-chat"
          onNavigate={closeNavigation}
        />
      </aside>
    </div>
  );
}
