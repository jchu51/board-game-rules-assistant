import type { AssistantMessage } from "./chat-types";

export function SourcesRail({ message }: { message?: AssistantMessage }) {
  return (
    <aside className="ref-scroll hidden w-[260px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-[#f0edfb] bg-white p-4 lg:flex">
      <div className="px-0.5 text-[11px] font-bold tracking-[0.07em] text-[#9ca3af] uppercase">
        Sources
      </div>
      {message ? (
        <div className="flex flex-col gap-2.5">
          {message.cites.map((citation) => (
            <div
              key={citation.n}
              className="flex flex-col gap-1.5 rounded-xl border border-[#f0edfb] p-3"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex size-[17px] shrink-0 items-center justify-center rounded-full bg-[#f1e9ff] text-[10px] font-bold text-[#7b2ff7]">
                  {citation.n}
                </span>
                <span className="text-[12.5px] font-semibold text-[#14171f]">
                  {citation.book}
                </span>
              </div>
              {citation.page ? (
                <div className="pl-[25px] text-[11.5px] text-[#9ca3af]">
                  p. {citation.page}
                </div>
              ) : null}
              <div className="pl-[25px] text-xs leading-5 text-[#5e6572] italic">
                "{citation.quote}"
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-0.5 pt-1 text-[12.5px] leading-6 text-[#9ca3af]">
          Rulebook citations for the latest answer will appear here.
        </div>
      )}
    </aside>
  );
}
