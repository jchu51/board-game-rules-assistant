import type { Role } from "./chat-types";
import { roleLabels, roleOrder } from "./chat-config";

export function RoleMenu(props: {
  activeRole: Role;
  onChange: (role: Role) => void;
}) {
  return (
    <div
      role="menu"
      aria-label="Preview role"
      className="absolute top-10 right-8 z-30 w-[190px] rounded-xl border border-[#edeae3] bg-white p-2 shadow-[0_12px_28px_-10px_rgba(20,23,31,0.14)]"
    >
      <div className="px-2.5 py-1.5 text-[10px] font-bold tracking-[0.06em] text-[#b8b2a6]">
        PREVIEW ROLE
      </div>
      {roleOrder.map((role) => (
        <button
          key={role}
          type="button"
          role="menuitemradio"
          aria-checked={role === props.activeRole}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-[#5b5648] hover:bg-[#f8f6ff] hover:text-[#6d5ef0]"
          onClick={() => props.onChange(role)}
        >
          {roleLabels[role]}
          {role === props.activeRole ? <span aria-hidden="true">✓</span> : null}
        </button>
      ))}
    </div>
  );
}
