"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OverlayScrollArea } from "./overlay-scroll-area";
import { workspaceLinks, projectLinks, settingsLinks, analyticsLink } from "./workspace-navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import type { Project } from "@/lib/api/project";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  project?: Project | null;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onNavigate?: () => void;
}

export function SidebarNav({ project, collapsed = false, onCollapsedChange, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const isAdmin = useAuthStore((state) => state.user?.roles?.includes("admin") ?? false);
  const projectId = pathname.match(/^\/projects\/(\d+)/)?.[1];

  function navLink(item: { label: string; href: string; icon: LucideIcon }, exact = true) {
    const active = exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link key={item.href} href={item.href} onClick={onNavigate}
        aria-current={active ? "page" : undefined} title={collapsed ? item.label : undefined}
        className={cn("flex h-9 items-center gap-3 rounded-xl border px-3 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
          collapsed && "justify-center px-0",
          active ? "border-border/40 bg-muted font-medium text-foreground" : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
        <item.icon className="size-4 shrink-0" aria-hidden="true" />
        <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
      </Link>
    );
  }

  return (
    <nav aria-label="工作区导航" className="flex h-full min-h-0 flex-col rounded-xl border border-border/30 bg-card">
      <div className={cn("flex shrink-0 items-center gap-2 p-3", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && <span className="text-xs font-medium text-muted-foreground">创作空间</span>}
        {onCollapsedChange && <Button variant="ghost" size="icon-sm" aria-label={collapsed ? "展开导航" : "收起导航"} onClick={() => onCollapsedChange(!collapsed)}>
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>}
      </div>
      <OverlayScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-6 px-2 pb-3">
          <div className="flex flex-col gap-2">{workspaceLinks.map((item) => navLink(item, item.href !== "/projects"))}</div>
          {projectId && <div className="flex flex-col gap-2">
            {!collapsed && <p className="truncate px-3 text-xs font-medium text-muted-foreground" title={project?.name}>{project?.name ?? "当前项目"}</p>}
            {projectLinks.map((item) => navLink({ ...item, href: `/projects/${projectId}${item.href}` }, item.href === ""))}
          </div>}
          <div className="flex flex-col gap-2">
            {!collapsed && <p className="px-3 text-xs font-medium text-muted-foreground">管理</p>}
            {navLink(analyticsLink)}
            {settingsLinks.filter((item) => !item.admin || isAdmin).map((item) => navLink(item))}
          </div>
        </div>
      </OverlayScrollArea>
    </nav>
  );
}