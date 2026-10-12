import { cookies } from "next/headers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WORKSPACE_ASSISTANT_COOKIE, WORKSPACE_NAVIGATION_COOKIE } from "@/lib/workspace-preferences";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const preferences = await cookies();
  return (
    <DashboardShell
      navigationCollapsed={preferences.get(WORKSPACE_NAVIGATION_COOKIE)?.value === "1"}
      assistantCollapsed={preferences.get(WORKSPACE_ASSISTANT_COOKIE)?.value === "1"}
    >
      {children}
    </DashboardShell>
  );
}
