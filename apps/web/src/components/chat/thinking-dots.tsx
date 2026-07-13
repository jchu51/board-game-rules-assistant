export function ThinkingDots() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="Thinking">
      {[0, 1, 2].map((dotIndex) => (
        <span
          key={dotIndex}
          className="size-[7px] rounded-full bg-[#c9b8f5] ref-dot"
          style={{ animationDelay: `${dotIndex * 0.18}s` }}
        />
      ))}
    </span>
  );
}
