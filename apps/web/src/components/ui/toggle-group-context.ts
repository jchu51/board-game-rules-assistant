import { createContext } from "react";

export type ToggleGroupContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

export const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(
  null,
);
