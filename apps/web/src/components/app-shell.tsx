import { BookOpen, FileText, MessageSquare } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router";

import { cn } from "@/lib/utils";

const navItems = [
  {
    id: "app-nav-chat-link",
    to: "/chat",
    label: "Chat",
    Icon: MessageSquare,
  },
  {
    id: "app-nav-library-link",
    to: "/library",
    label: "Library",
    Icon: FileText,
  },
];

export function AppShell() {
  const location = useLocation();

  if (location.pathname.startsWith("/chat")) {
    return <Outlet />;
  }

  return (
    <div className="flex h-svh min-h-svh flex-col bg-background text-foreground md:flex-row">
      <aside className="flex shrink-0 flex-col gap-7 border-b border-sidebar-border bg-sidebar px-4 py-5 md:h-svh md:w-[296px] md:border-r md:border-b-0">
        <NavLink
          id="app-brand-link"
          data-testid="app-brand-link"
          to="/chat"
          className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-1 text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring/50"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-sidebar-primary text-sidebar-primary-foreground">
            <BookOpen className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="min-w-0 text-base leading-tight font-semibold">
            Rulebook Referee
          </span>
        </NavLink>

        <div className="flex flex-col gap-3">
          <div className="px-3 text-xs font-semibold text-muted-foreground uppercase">
            Menu
          </div>
          <nav
            className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
            aria-label="Primary"
          >
            {navItems.map(({ id, to, label, Icon }) => (
              <NavLink
                key={to}
                id={id}
                data-testid={id}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex h-11 shrink-0 items-center gap-3 rounded-xl border px-4 text-base outline-none transition-colors focus-visible:ring-3 focus-visible:ring-sidebar-ring/50",
                    isActive
                      ? "border-border bg-background font-semibold text-foreground shadow-sm"
                      : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )
                }
              >
                <Icon className="size-[18px]" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
