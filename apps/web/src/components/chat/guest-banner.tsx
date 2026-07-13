export function GuestBanner({
  text,
  onUpgrade,
}: {
  text: string;
  onUpgrade: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2.5 border-b border-[#f1e4c2] bg-[#fdf7ea] px-5 py-2.5">
      <span className="size-[7px] rounded-full bg-[#e3c88a]" />
      <span className="text-[12.5px] text-[#8a6d2f]">{text}</span>
      <button
        id="chat-upgrade-standard-btn"
        data-testid="chat-upgrade-standard-btn"
        type="button"
        className="text-xs font-bold text-[#6d5ef0] hover:text-[#6620db]"
        onClick={onUpgrade}
      >
        Upgrade to Standard
      </button>
    </div>
  );
}
