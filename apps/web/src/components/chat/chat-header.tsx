import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { roleLabels, roleOrder } from "./chat-config";
import { PlanPopover } from "./plan-popover";
import type { Conversation, Role } from "./chat-types";

export function ChatHeader(props: {
  conversation: Conversation;
  infoOpen: boolean;
  role: Role;
  onInfoOpenChange: (open: boolean) => void;
  onRoleChange: (role: Role) => void;
}) {
  const { conversation, infoOpen, role, onInfoOpenChange, onRoleChange } =
    props;
  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-[#f0edfb] bg-white px-5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="font-heading truncate text-base font-bold text-[#14171f]">
          {conversation.title}
        </span>
        {conversation.game ? (
          <span className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#f1e9ff] px-3 py-1.5 text-[12.5px] font-semibold text-[#7b2ff7]">
            <span className="size-1.5 rounded-full bg-[#00c4cc]" />
            {conversation.game}
          </span>
        ) : null}
      </div>
      <div className="relative hidden shrink-0 items-center gap-2 sm:flex">
        <div
          role="radiogroup"
          aria-label="Preview as role"
          className="flex overflow-hidden rounded-full border border-[#edeafb]"
        >
          {roleOrder.map((nextRole) => (
            <button
              key={nextRole}
              id={`chat-role-${nextRole}-radio`}
              data-testid={`chat-role-${nextRole}-radio`}
              type="button"
              role="radio"
              aria-checked={role === nextRole}
              className={cn(
                "border-l border-[#edeafb] px-3 py-1.5 text-xs font-semibold first:border-l-0",
                role === nextRole
                  ? "bg-[#14171f] text-white"
                  : "bg-white text-[#5e6572] hover:bg-[#f7f5ff] hover:text-[#7b2ff7]",
              )}
              onClick={() => {
                onRoleChange(nextRole);
                onInfoOpenChange(false);
              }}
            >
              {roleLabels[nextRole]}
            </button>
          ))}
        </div>
        <button
          id="chat-plan-info-btn"
          data-testid="chat-plan-info-btn"
          type="button"
          aria-label="What can each plan do?"
          aria-expanded={infoOpen}
          className={cn(
            "flex size-6 items-center justify-center rounded-full border border-[#dcd5f5] text-[#7b2ff7] hover:bg-[#f1e9ff]",
            infoOpen ? "bg-[#f1e9ff]" : "bg-white",
          )}
          onClick={() => onInfoOpenChange(!infoOpen)}
        >
          <Info className="size-3.5" aria-hidden="true" />
        </button>
        {infoOpen ? <PlanPopover activeRole={role} /> : null}
      </div>
    </header>
  );
}
