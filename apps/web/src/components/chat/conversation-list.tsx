import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Conversation } from "./chat-types";

export type ConversationListProps = {
  activeId: string | null;
  conversations: Conversation[];
  idPrefix?: string;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
};

export function ConversationList(props: ConversationListProps) {
  const {
    activeId,
    conversations,
    idPrefix = "chat",
    onDelete,
    onSelect,
  } = props;

  return (
    <div className="flex flex-col gap-0.5">
      {conversations.map((conversation) => {
        const active = conversation.id === activeId;

        return (
          <div key={conversation.id} className="relative">
            <button
              id={`${idPrefix}-select-${conversation.id}-btn`}
              data-testid={`${idPrefix}-select-${conversation.id}-btn`}
              type="button"
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-[10px] pr-8 pl-2.5 text-left text-[13.5px] outline-none hover:bg-[#f8f6ff] focus-visible:ring-2 focus-visible:ring-[#6d5ef0]",
                active
                  ? "bg-[#efebfc] font-semibold text-[#6d5ef0]"
                  : "bg-transparent font-medium text-[#14171f]",
              )}
              onClick={() => onSelect(conversation.id)}
            >
              <span className="min-w-0 flex-1 truncate">
                {conversation.title}
              </span>
            </button>
            <button
              id={`${idPrefix}-delete-${conversation.id}-btn`}
              data-testid={`${idPrefix}-delete-${conversation.id}-btn`}
              type="button"
              aria-label={`Delete ${conversation.title}`}
              className="absolute top-1/2 right-1.5 flex size-[26px] -translate-y-1/2 items-center justify-center rounded-lg text-[#b8b2a6] hover:bg-[#edeae3] hover:text-[#c0362c]"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(conversation.id);
              }}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
