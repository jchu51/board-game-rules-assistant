import { planRows, roleLabels, roleOrder } from "./chat-config";
import type { Role } from "./chat-types";
import { cn } from "@/lib/utils";

export function PlanPopover({ activeRole }: { activeRole: Role }) {
  return (
    <div className="absolute top-8 right-0 z-20 w-[460px] rounded-[14px] border border-[#edeafb] bg-white p-3.5 shadow-[0_14px_34px_-12px_rgba(20,23,31,0.22)]">
      <div className="grid grid-cols-[92px_repeat(4,1fr)] items-start gap-x-2 gap-y-2.5">
        <div />
        {roleOrder.map((role) => (
          <div
            key={role}
            className={cn(
              "font-heading text-[11.5px] font-bold",
              activeRole === role ? "text-[#7b2ff7]" : "text-[#14171f]",
            )}
          >
            {roleLabels[role]}
          </div>
        ))}
        {planRows.flatMap((row) => [
          <div
            key={`${row.id}-label`}
            className="pt-px text-[11px] font-semibold text-[#9ca3af]"
          >
            {row.label}
          </div>,
          ...roleOrder.map((role) => (
            <div
              key={`${row.id}-${role}`}
              className="text-[11.5px] leading-4 text-[#3a3f4b]"
            >
              {row[role]}
            </div>
          )),
        ])}
      </div>
    </div>
  );
}
