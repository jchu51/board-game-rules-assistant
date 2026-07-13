import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Conversation } from "./chat-types";

export type ConversationGroupProps = {
  activeId: string | null;
  conversations: Conversation[];
  dotColor: string;
  idPrefix?: string;
  label: string;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
};

export function ConversationGroup(props: ConversationGroupProps) {
  const {
    activeId,
    conversations,
    dotColor,
    idPrefix = "chat",
    label,
    onDelete,
    onSelect,
  } = props;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 px-2.5 pb-1.5 text-[10.5px] font-bold tracking-[0.08em] text-[#9ca3af] uppercase">
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        {label}
      </div>
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
                "flex h-9 w-full items-center gap-2 rounded-[10px] pr-8 pl-2.5 text-left text-[13.5px] outline-none hover:bg-[#f7f5ff] focus-visible:ring-2 focus-visible:ring-[#7b2ff7]",
                active
                  ? "bg-[#f1e9ff] font-semibold text-[#7b2ff7]"
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
              className="absolute top-1/2 right-1.5 flex size-[26px] -translate-y-1/2 items-center justify-center rounded-lg text-[#9ca3af] hover:bg-[#edeafb] hover:text-[#c0362c]"
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
