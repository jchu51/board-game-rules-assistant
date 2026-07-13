import { BookOpen, Plus } from "lucide-react";

import { ChatNavigationContent } from "./chat-navigation-content";
import type { ChatController } from "./use-chat-controller";

export function ChatSidebar({ chat }: { chat: ChatController }) {
  return (
    <aside className="hidden w-[268px] shrink-0 flex-col border-r border-[#f0edfb] bg-white px-3 py-4 md:flex">
      <div className="flex items-center gap-2.5 px-2 pt-1 pb-3.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#7b2ff7,#00c4cc)] text-white">
          <BookOpen className="size-4" aria-hidden="true" />
        </div>
        <span className="font-heading text-[15px] font-bold text-[#14171f]">
          Rulebook Referee
        </span>
      </div>
      <button
        id="ask-new-chat-btn"
        data-testid="ask-new-chat-btn"
        type="button"
        disabled={chat.isCreatingChat}
        className="mb-3.5 flex h-10 items-center gap-2 rounded-xl border border-[#edeafb] bg-[#f7f5ff] px-3.5 text-[13.5px] font-semibold text-[#7b2ff7] outline-none hover:bg-[#f1e9ff] focus-visible:ring-2 focus-visible:ring-[#7b2ff7] disabled:cursor-not-allowed disabled:opacity-60"
        onClick={chat.handleNewChat}
      >
        <Plus className="size-[15px]" aria-hidden="true" />
        New chat
      </button>
      <ChatNavigationContent chat={chat} idPrefix="chat" />
    </aside>
  );
}
