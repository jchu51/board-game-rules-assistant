import { type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ToggleGroupContext } from "./toggle-group-context";

type ToggleGroupProps = Omit<ComponentProps<"div">, "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
};

function ToggleGroup({
  className,
  value,
  onValueChange,
  ...props
}: ToggleGroupProps) {
  return (
    <ToggleGroupContext.Provider value={{ value, onValueChange }}>
      <div
        data-slot="toggle-group"
        className={cn(
          "bg-muted inline-flex items-center gap-1 rounded-lg p-1",
          className,
        )}
        {...props}
      />
    </ToggleGroupContext.Provider>
  );
}

export { ToggleGroup };
export { ToggleGroupItem } from "./toggle-group-item";
