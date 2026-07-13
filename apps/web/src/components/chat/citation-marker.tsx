export function CitationMarker({ number }: { number: string }) {
  return (
    <sup className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[#dccffb] bg-[#f1e9ff] px-1 align-super text-[10px] leading-none font-bold text-[#7b2ff7]">
      {number}
    </sup>
  );
}
