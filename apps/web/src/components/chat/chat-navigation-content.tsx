import { FileText, Search } from "lucide-react";
import { NavLink } from "react-router";

import { ConversationGroup } from "./conversation-group";
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
          className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#9ca3af]"
          aria-hidden="true"
        />
        <input
          id={`${idPrefix}-search-input`}
          data-testid={`${idPrefix}-search-input`}
          value={chat.search}
          aria-label="Search chats"
          placeholder="Search chats"
          className="h-[34px] w-full rounded-[10px] border border-[#edeafb] bg-[#fafafb] pr-3 pl-8 text-[13px] text-[#14171f] outline-none placeholder:text-[#9ca3af] focus:border-[#7b2ff7] focus:bg-white focus:shadow-[0_0_0_3px_rgba(123,47,247,0.12)]"
          onChange={(event) => chat.setSearch(event.target.value)}
        />
      </div>
      <nav
        aria-label="Conversations"
        className="ref-scroll flex flex-1 flex-col gap-3.5 overflow-y-auto"
      >
        {chat.search.trim() && chat.filteredConversations.length === 0 ? (
          <div className="px-2.5 py-2 text-[12.5px] text-[#9ca3af]">
            No chats match "{chat.search}".
          </div>
        ) : null}
        {chat.ungrouped.length ? (
          <ConversationGroup
            activeId={chat.activeId}
            conversations={chat.ungrouped}
            dotColor="#d9d4e8"
            idPrefix={idPrefix}
            label="New"
            onDelete={chat.deleteConversation}
            onSelect={(conversationId) => {
              chat.setActiveId(conversationId);
              onNavigate?.();
            }}
          />
        ) : null}
        {chat.gameGroups.map(([game, conversations]) => (
          <ConversationGroup
            key={game}
            activeId={chat.activeId}
            conversations={conversations}
            dotColor="#00c4cc"
            idPrefix={idPrefix}
            label={game}
            onDelete={chat.deleteConversation}
            onSelect={(conversationId) => {
              chat.setActiveId(conversationId);
              onNavigate?.();
            }}
          />
        ))}
      </nav>
      <NavLink
        id={`${idPrefix}-library-link`}
        data-testid={`${idPrefix}-library-link`}
        to="/library"
        className="mt-2 flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium text-[#5e6572] outline-none hover:bg-[#f7f5ff] hover:text-[#7b2ff7] focus-visible:ring-2 focus-visible:ring-[#7b2ff7]"
        onClick={onNavigate}
      >
        <FileText className="size-4" aria-hidden="true" />
        Library
      </NavLink>
    </div>
  );
}
