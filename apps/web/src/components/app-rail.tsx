import { BookOpen, FileText, MessageSquare } from "lucide-react";
import { NavLink } from "react-router";

import { cn } from "@/lib/utils";

export function AppRail() {
  const links = [
    { to: "/chat", label: "Ask", Icon: MessageSquare },
    { to: "/library", label: "Library", Icon: FileText },
  ];

  return (
    <aside className="hidden w-[72px] shrink-0 flex-col items-center gap-5 border-r border-[#edeae3] bg-white py-[18px] md:flex">
      <NavLink
        to="/chat"
        aria-label="Rulebook Referee"
        className="flex size-[38px] items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,#6d5ef0,#3fbfa8)] text-white outline-none focus-visible:ring-2 focus-visible:ring-[#6d5ef0] focus-visible:ring-offset-2"
      >
        <BookOpen className="size-[19px]" aria-hidden="true" />
      </NavLink>
      <nav aria-label="Sections" className="mt-1.5 flex flex-col gap-2">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                "flex size-[42px] items-center justify-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#6d5ef0] focus-visible:ring-offset-2",
                isActive
                  ? "bg-[#efebfc] text-[#6d5ef0]"
                  : "text-[#b8b2a6] hover:bg-[#f8f6ff] hover:text-[#6d5ef0]",
              )
            }
          >
            <Icon className="size-[19px]" aria-hidden="true" />
          </NavLink>
        ))}
      </nav>
      <div className="font-heading mt-auto flex size-[34px] items-center justify-center rounded-full bg-[#edeae3] text-xs font-bold text-[#6d5ef0]">
        RF
      </div>
    </aside>
  );
}
