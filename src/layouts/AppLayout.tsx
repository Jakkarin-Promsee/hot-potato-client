import { Outlet } from "react-router-dom";
import { TopNav } from "@/components/TopNav";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
