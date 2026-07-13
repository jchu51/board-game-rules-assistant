import { Info, Menu } from "lucide-react";
import type { RefObject } from "react";

export function LibraryHeader(props: {
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  navigationOpen: boolean;
  onMenuClick: () => void;
}) {
  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-[#edeae3] bg-white px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          ref={props.menuButtonRef}
          data-testid="library-mobile-menu-btn"
          type="button"
          aria-label="Open main navigation"
          aria-controls="library-mobile-navigation"
          aria-expanded={props.navigationOpen}
          className="flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-[#edeae3] bg-white outline-none hover:bg-[#f8f6ff] focus-visible:ring-2 focus-visible:ring-[#6d5ef0] md:hidden"
          onClick={props.onMenuClick}
        >
          <Menu className="size-4" aria-hidden="true" />
        </button>
        <span className="font-heading text-base font-bold">Library</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-[#dcd3fa] px-3 py-1.5 text-[10.5px] font-bold tracking-[0.04em] text-[#6d5ef0]">
          PRO
        </span>
        <button
          type="button"
          aria-label="What can each plan do?"
          className="flex size-6 items-center justify-center rounded-full border border-[#dcd3fa] text-[#6d5ef0] hover:bg-[#efebfc]"
        >
          <Info className="size-3" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
