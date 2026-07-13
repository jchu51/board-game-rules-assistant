import { useContext, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { ToggleGroupContext } from "./toggle-group-context";

export function ToggleGroupItem({
  className,
  value,
  children,
  ...props
}: ComponentProps<"button"> & { value: string }) {
  const context = useContext(ToggleGroupContext);
  const isActive = context?.value === value;
  return (
    <button
      data-slot="toggle-group-item"
      data-state={isActive ? "on" : "off"}
      type="button"
      className={cn(
        "inline-flex h-7 shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors outline-none hover:bg-background hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs",
        className,
      )}
      aria-pressed={isActive}
      onClick={() => context?.onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  );
}
