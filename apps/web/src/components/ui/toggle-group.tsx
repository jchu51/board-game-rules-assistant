import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

type ToggleGroupContextValue = {
  value: string
  onValueChange: (value: string) => void
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null)

type ToggleGroupProps = Omit<ComponentProps<"div">, "onChange"> & {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
}

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
  )
}

type ToggleGroupItemProps = ComponentProps<"button"> & {
  value: string
}

function ToggleGroupItem({
  className,
  value,
  children,
  ...props
}: ToggleGroupItemProps) {
  const context = useContext(ToggleGroupContext)
  const isActive = context?.value === value

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
  )
}

export { ToggleGroup, ToggleGroupItem }
