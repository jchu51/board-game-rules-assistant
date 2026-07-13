import { BookOpen, FileText, MessageSquare, X } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";
import { NavLink } from "react-router";

import { cn } from "@/lib/utils";

export function MobileAppDrawer(props: {
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
}) {
  const { menuButtonRef, onClose, open } = props;
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const links = [
    { to: "/chat", label: "Ask", Icon: MessageSquare },
    { to: "/library", label: "Library", Icon: FileText },
  ];
  const close = () => {
    onClose();
    menuButtonRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="Close main navigation"
        className="absolute inset-0 size-full bg-[#14171f]/35"
        onClick={close}
      />
      <aside
        id="library-mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        className="absolute inset-y-0 left-0 flex w-[min(82vw,270px)] flex-col bg-white p-4 shadow-2xl"
      >
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#6d5ef0,#3fbfa8)] text-white">
            <BookOpen className="size-4" aria-hidden="true" />
          </span>
          <span className="font-heading flex-1 text-[15px] font-bold">
            Rulebook Referee
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close main navigation"
            className="flex size-8 items-center justify-center rounded-lg hover:bg-[#f8f6ff]"
            onClick={close}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <nav
          aria-label="Mobile sections"
          className="mt-auto flex flex-col gap-0.5 border-t border-[#edeae3] pt-2"
        >
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px]",
                  isActive
                    ? "bg-[#efebfc] font-semibold text-[#6d5ef0]"
                    : "font-medium text-[#5b5648] hover:bg-[#f8f6ff] hover:text-[#6d5ef0]",
                )
              }
              onClick={close}
            >
              <Icon className="size-[17px]" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  );
}
