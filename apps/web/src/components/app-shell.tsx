import { Outlet } from "react-router";

import { AppRail } from "./app-rail";

export function AppShell() {
  return (
    <div className="flex h-svh min-h-svh bg-[#fcfbfa] text-[#14171f] antialiased">
      <AppRail />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
