import { Plus } from "lucide-react";

import { ChatNavigationContent } from "./chat-navigation-content";
import type { ChatController } from "./use-chat-controller";

export function ChatSidebar({ chat }: { chat: ChatController }) {
  return (
    <aside className="hidden w-[268px] shrink-0 flex-col border-r border-[#edeae3] bg-white px-3 py-4 md:flex">
      <button
        id="ask-new-chat-btn"
        data-testid="ask-new-chat-btn"
        type="button"
        disabled={chat.isCreatingChat}
        className="mb-3.5 flex h-10 items-center gap-2 rounded-xl border border-[#edeae3] bg-[#f8f6ff] px-3.5 text-[13.5px] font-semibold text-[#6d5ef0] outline-none hover:bg-[#efebfc] focus-visible:ring-2 focus-visible:ring-[#6d5ef0] disabled:cursor-not-allowed disabled:opacity-60"
        onClick={chat.handleNewChat}
      >
        <Plus className="size-[15px]" aria-hidden="true" />
        New chat
      </button>
      <ChatNavigationContent chat={chat} idPrefix="chat" />
    </aside>
  );
}
