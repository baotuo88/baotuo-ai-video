"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Bot, LogOut, Menu, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { UserAvatarDropdown } from "@/components/ui/menu";
import { NotificationPanel } from "./notification-panel";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import { requestAssistantOpen } from "./assistant/open-assistant";
import { useAuthStore } from "@/lib/store/auth-store";
import { usePipelineStore } from "@/lib/store/pipeline-store";

export function AppHeader({ onOpenNavigation }: { onOpenNavigation: () => void }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const bellRef = useRef<HTMLButtonElement>(null);
  const { tasks, notificationOpen, panelExpanded, setPanelExpanded, setNotificationOpen,
    restoreRunningPipelines, resumePipelineConnections } = usePipelineStore();
  const runningCount = tasks.filter((task) => task.status === "running").length;

  useEffect(() => { restoreRunningPipelines(); }, [restoreRunningPipelines]);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") resumePipelineConnections();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [resumePipelineConnections]);

  const closeNotifications = useCallback(() => {
    setPanelExpanded(false);
    setNotificationOpen(false);
  }, [setPanelExpanded, setNotificationOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-20 bg-background px-3 py-3">
      <div className="flex h-full items-center justify-between gap-3 border-b border-border/20 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="打开导航" onClick={onOpenNavigation}><Menu /></Button>
          <Link href="/dashboard" aria-label="baotuo-ai-video 工作台" className="min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Brand /></Link>
          <span className="hidden border-l border-border/20 pl-3 text-xs text-muted-foreground md:block">视频创作工作台</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="切换明暗主题" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            <Sun className="hidden dark:block" /><Moon className="dark:hidden" />
          </Button>
          <Button ref={bellRef} variant="ghost" size="icon" aria-label={runningCount ? `任务中心，${runningCount} 个任务运行中` : "任务中心"} title="任务中心" onClick={() => panelExpanded ? closeNotifications() : setPanelExpanded(true)}><Bell /></Button>
          {runningCount > 0 && <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">{runningCount} 运行中</span>}
          <Button variant="ai" size="icon" aria-label="打开 AI 助手" title="AI 助手" onClick={requestAssistantOpen}><Bot /></Button>
          <UserAvatarDropdown user={{ name: user?.nickname || user?.username || "用户", email: user?.email || user?.username, avatarUrl: user?.avatar }}
            menuItems={[{ label: "个人设置", icon: <Settings className="size-4" />, onClick: () => router.push("/settings/profile") }]}
            logoutItem={{ label: "退出登录", icon: <LogOut className="size-4" />, onClick: async () => {
              document.cookie = "auth-token=; path=/; max-age=0";
              await logout();
            } }} />
        </div>
      </div>
      <ClientErrorBoundary key={`notifications-${notificationOpen}-${panelExpanded}`} context="任务中心加载失败" onError={closeNotifications}>
        <NotificationPanel anchorRef={bellRef} />
      </ClientErrorBoundary>
    </header>
  );
}