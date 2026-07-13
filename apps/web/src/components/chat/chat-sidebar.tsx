import { BookOpen, FileText, Plus, Search } from "lucide-react";
import { NavLink } from "react-router";

import type { ChatController } from "./use-chat-controller";
import { ConversationGroup } from "./conversation-group";

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
      {chat.createChatError ? (
        <p role="alert" className="mb-3 px-2 text-[12px] text-red-600">
          {chat.createChatError}
        </p>
      ) : null}
      <div className="relative mb-3">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#9ca3af]"
          aria-hidden="true"
        />
        <input
          id="chat-search-input"
          data-testid="chat-search-input"
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
            label="New"
            onDelete={chat.deleteConversation}
            onSelect={chat.setActiveId}
          />
        ) : null}
        {chat.gameGroups.map(([game, conversations]) => (
          <ConversationGroup
            key={game}
            activeId={chat.activeId}
            conversations={conversations}
            dotColor="#00c4cc"
            label={game}
            onDelete={chat.deleteConversation}
            onSelect={chat.setActiveId}
          />
        ))}
      </nav>
      <NavLink
        id="chat-library-link"
        data-testid="chat-library-link"
        to="/library"
        className="mt-2 flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium text-[#5e6572] outline-none hover:bg-[#f7f5ff] hover:text-[#7b2ff7] focus-visible:ring-2 focus-visible:ring-[#7b2ff7]"
      >
        <FileText className="size-4" aria-hidden="true" />
        Library
      </NavLink>
    </aside>
  );
}
