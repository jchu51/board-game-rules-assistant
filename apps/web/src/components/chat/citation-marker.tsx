export function CitationMarker({ number }: { number: string }) {
  return (
    <sup className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[#dccffb] bg-[#efebfc] px-1 align-super text-[10px] leading-none font-bold text-[#6d5ef0]">
      {number}
    </sup>
  );
}
