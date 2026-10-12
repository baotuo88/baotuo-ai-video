"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { AppHeader } from "@/components/dashboard/app-header";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { OverlayScrollArea } from "@/components/dashboard/overlay-scroll-area";
import { WorkspaceAssistant } from "@/components/dashboard/assistant/workspace-assistant";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import { ErrorRecoveryPanel } from "@/components/error-recovery-panel";
import { getClientErrorMessage } from "@/lib/client-error";
import { projectApi, type Project } from "@/lib/api/project";
import { toastApiError } from "@/lib/api/toast-api-error";
import { cn } from "@/lib/utils";
import { setWorkspacePreference, WORKSPACE_NAVIGATION_COOKIE } from "@/lib/workspace-preferences";

export function DashboardShell({ children, navigationCollapsed, assistantCollapsed }: {
  children: React.ReactNode;
  navigationCollapsed: boolean;
  assistantCollapsed: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const authenticated = useAuthStore((state) => state.isAuthenticated());
  const hydrated = useSyncExternalStore(
    (changed) => {
      const start = useAuthStore.persist.onHydrate(changed);
      const finish = useAuthStore.persist.onFinishHydration(changed);
      return () => { start(); finish(); };
    },
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );
  const [collapsed, updateCollapsed] = useState(navigationCollapsed);
  const setCollapsed = (value: boolean) => {
    updateCollapsed(value);
    setWorkspacePreference(WORKSPACE_NAVIGATION_COOKIE, value);
  };
  const [navigationRoute, setNavigationRoute] = useState<string | null>(null);
  const [projectState, setProjectState] = useState<{ id: number; project: Project } | null>(null);
  const match = pathname.match(/^\/projects\/(\d+)/);
  const projectId = match ? Number(match[1]) : null;
  const project = projectState?.id === projectId ? projectState.project : null;
  const ready = hydrated && authenticated;

  useEffect(() => {
    if (hydrated && !authenticated) router.replace("/login");
  }, [hydrated, authenticated, router]);

  useEffect(() => {
    if (!ready || projectId === null) return;
    let cancelled = false;
    projectApi.get(projectId).then((value) => {
      if (!cancelled) setProjectState({ id: projectId, project: value });
    }).catch((error) => {
      if (!cancelled) toastApiError(error, "加载项目信息失败");
    });
    return () => { cancelled = true; };
  }, [projectId, ready]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <ClientErrorBoundary context="顶部工具栏运行异常">
        <AppHeader onOpenNavigation={() => setNavigationRoute(pathname)} />
      </ClientErrorBoundary>
      <div className="flex min-h-0 flex-1 pt-20">
        <div className={cn("hidden shrink-0 lg:block", collapsed ? "w-20" : "w-56")}>
          <aside className={cn("fixed bottom-3 left-3 top-20", collapsed ? "w-14" : "w-52")}>
            <ClientErrorBoundary context="导航运行异常">
              <SidebarNav project={project} collapsed={collapsed} onCollapsedChange={setCollapsed} />
            </ClientErrorBoundary>
          </aside>
        </div>
        <main id="workspace-main" className="dashboard-scroll flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <OverlayScrollArea key={pathname} className="min-h-0 flex-1">
            <div className="dashboard-content flex min-h-full w-full shrink-0 flex-col pt-4">
              <ClientErrorBoundary key={pathname} context="当前页面运行异常" fallback={(error, reset) => (
                <ErrorRecoveryPanel title="当前页面发生异常" description="请重试或返回工作台。" details={getClientErrorMessage(error)} onRetry={reset} onGoHome={() => router.push("/dashboard")} />
              )}>
                {ready ? children : <p role="status" className="p-6 text-sm text-muted-foreground">正在加载工作台…</p>}
              </ClientErrorBoundary>
            </div>
          </OverlayScrollArea>
        </main>
        <ClientErrorBoundary context="AI 助手运行异常"><WorkspaceAssistant projectId={projectId} initiallyCollapsed={assistantCollapsed} /></ClientErrorBoundary>
      </div>
      <Sheet open={navigationRoute === pathname} onOpenChange={(open) => setNavigationRoute(open ? pathname : null)}>
        <SheetContent side="left" className="overflow-hidden motion-reduce:transition-none">
          <SheetHeader className="shrink-0"><SheetTitle>创作空间</SheetTitle><SheetDescription>baotuo-ai-video</SheetDescription></SheetHeader>
          <div className="min-h-0 flex-1 px-3 pb-3"><SidebarNav project={project} onNavigate={() => setNavigationRoute(null)} /></div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
