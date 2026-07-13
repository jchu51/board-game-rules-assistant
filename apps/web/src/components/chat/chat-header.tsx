import { Info } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { roleLabels } from "./chat-config";
import { PlanPopover } from "./plan-popover";
import { RoleMenu } from "./role-menu";
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
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  return (
    <header className="hidden h-[60px] shrink-0 items-center justify-between border-b border-[#edeae3] bg-white px-[22px] md:flex">
      <div className="flex min-w-0 items-center gap-2">
        <span className="font-heading truncate text-base font-bold text-[#14171f]">
          {conversation.title}
        </span>
        {conversation.game ? (
          <span className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#efebfc] px-3 py-1.5 text-[12.5px] font-semibold text-[#6d5ef0]">
            <span className="size-1.5 rounded-full bg-[#3fbfa8]" />
            {conversation.game}
          </span>
        ) : null}
      </div>
      <div className="relative flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={roleMenuOpen}
          aria-label="Switch preview role"
          className="rounded-full border border-[#dcd3fa] px-3 py-1.5 text-[10.5px] font-bold tracking-[0.04em] text-[#6d5ef0]"
          onClick={() => {
            setRoleMenuOpen((open) => !open);
            onInfoOpenChange(false);
          }}
        >
          {roleLabels[role].toUpperCase()}
        </button>
        <button
          id="chat-plan-info-btn"
          data-testid="chat-plan-info-btn"
          type="button"
          aria-label="What can each plan do?"
          aria-expanded={infoOpen}
          className={cn(
            "flex size-6 items-center justify-center rounded-full border border-[#dcd3fa] text-[#6d5ef0] hover:bg-[#efebfc]",
            infoOpen ? "bg-[#efebfc]" : "bg-white",
          )}
          onClick={() => {
            setRoleMenuOpen(false);
            onInfoOpenChange(!infoOpen);
          }}
        >
          <Info className="size-3.5" aria-hidden="true" />
        </button>
        {infoOpen ? <PlanPopover activeRole={role} /> : null}
        {roleMenuOpen ? (
          <RoleMenu
            activeRole={role}
            onChange={(nextRole) => {
              onRoleChange(nextRole);
              setRoleMenuOpen(false);
            }}
          />
        ) : null}
      </div>
    </header>
  );
}
