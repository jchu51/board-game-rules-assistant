import type { AssistantMessage } from "./chat-types";
import { FileText, X } from "lucide-react";
import { useState } from "react";

export function SourcesRail({ message }: { message?: AssistantMessage }) {
  const [open, setOpen] = useState(false);
  const cards = message?.cites.map((citation) => (
    <div
      key={citation.n}
      className="flex flex-col gap-1.5 rounded-xl border border-[#edeae3] p-3"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex size-[17px] shrink-0 items-center justify-center rounded-full bg-[#efebfc] text-[10px] font-bold text-[#6d5ef0]">
          {citation.n}
        </span>
        <span className="text-[12.5px] font-semibold text-[#14171f]">
          {citation.book}
        </span>
      </div>
      {citation.page ? (
        <div className="pl-[25px] text-[11.5px] text-[#b8b2a6]">
          p. {citation.page}
        </div>
      ) : null}
      <div className="pl-[25px] text-xs leading-5 text-[#5b5648] italic">
        &quot;{citation.quote}&quot;
      </div>
    </div>
  ));

  return (
    <>
      <aside className="ref-scroll hidden w-[260px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-[#edeae3] bg-white p-4 lg:flex">
        <div className="px-0.5 text-[11px] font-bold tracking-[0.07em] text-[#b8b2a6] uppercase">
          Sources
        </div>
        {message ? (
          <div className="flex flex-col gap-2.5">{cards}</div>
        ) : (
          <div className="px-0.5 pt-1 text-[12.5px] leading-6 text-[#b8b2a6]">
            Rulebook citations for the latest answer will appear here.
          </div>
        )}
      </aside>
      {message ? (
        <button
          type="button"
          aria-label="View sources"
          className="fixed right-[18px] bottom-24 z-30 flex size-[46px] items-center justify-center rounded-full bg-[#14171f] text-white shadow-[0_10px_24px_-8px_rgba(20,23,31,0.4)] lg:hidden"
          onClick={() => setOpen(true)}
        >
          <FileText className="size-[18px]" aria-hidden="true" />
        </button>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close sources"
            className="absolute inset-0 size-full bg-[#14171f]/35"
            onClick={() => setOpen(false)}
          />
          <aside
            aria-label="Sources"
            className="absolute right-0 bottom-0 left-0 flex max-h-[75vh] flex-col gap-3 overflow-y-auto rounded-t-[20px] bg-white p-4 pb-5 shadow-2xl"
          >
            <div className="flex items-center justify-between text-[11px] font-bold tracking-[0.07em] text-[#b8b2a6] uppercase">
              Sources
              <button
                type="button"
                aria-label="Close sources"
                className="flex size-7 items-center justify-center rounded-full bg-[#f8f6ff]"
                onClick={() => setOpen(false)}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            {cards}
          </aside>
        </div>
      ) : null}
    </>
  );
}
