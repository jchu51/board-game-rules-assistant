import { FileText, MessageSquare, Search } from "lucide-react";
import { NavLink } from "react-router";

import { ConversationList } from "./conversation-list";
import type { ChatController } from "./use-chat-controller";

export function ChatNavigationContent(props: {
  chat: ChatController;
  idPrefix: string;
  onNavigate?: () => void;
}) {
  const { chat, idPrefix, onNavigate } = props;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative mb-3">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#b8b2a6]"
          aria-hidden="true"
        />
        <input
          id={`${idPrefix}-search-input`}
          data-testid={`${idPrefix}-search-input`}
          value={chat.search}
          aria-label="Search chats"
          placeholder="Search chats"
          className="h-[34px] w-full rounded-[10px] border border-[#edeae3] bg-[#fafafb] pr-3 pl-8 text-[13px] text-[#14171f] outline-none placeholder:text-[#b8b2a6] focus:border-[#6d5ef0] focus:bg-white focus:shadow-[0_0_0_3px_rgba(109,94,240,0.12)]"
          onChange={(event) => chat.setSearch(event.target.value)}
        />
      </div>
      <nav
        aria-label="Conversations"
        className="ref-scroll flex flex-1 flex-col gap-3.5 overflow-y-auto"
      >
        {chat.search.trim() && chat.filteredConversations.length === 0 ? (
          <div className="px-2.5 py-2 text-[12.5px] text-[#b8b2a6]">
            No chats match "{chat.search}".
          </div>
        ) : null}
        {chat.filteredConversations.length > 0 ? (
          <ConversationList
            activeId={chat.activeId}
            conversations={chat.filteredConversations}
            idPrefix={idPrefix}
            onDelete={chat.deleteConversation}
            onSelect={(conversationId) => {
              void chat.selectConversation(conversationId);
              onNavigate?.();
            }}
          />
        ) : null}
      </nav>
      <div className="mt-2 flex flex-col gap-0.5 border-t border-[#edeae3] pt-2">
        <NavLink
          to="/chat"
          aria-label="Ask"
          className="flex items-center gap-2.5 rounded-[10px] bg-[#efebfc] px-3 py-2.5 text-[13.5px] font-semibold text-[#6d5ef0]"
          onClick={onNavigate}
        >
          <MessageSquare className="size-4" aria-hidden="true" />
          Ask
        </NavLink>
        <NavLink
          id={`${idPrefix}-library-link`}
          data-testid={`${idPrefix}-library-link`}
          to="/library"
          className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium text-[#5b5648] outline-none hover:bg-[#f8f6ff] hover:text-[#6d5ef0] focus-visible:ring-2 focus-visible:ring-[#6d5ef0]"
          onClick={onNavigate}
        >
          <FileText className="size-4" aria-hidden="true" />
          Library
        </NavLink>
      </div>
    </div>
  );
}
