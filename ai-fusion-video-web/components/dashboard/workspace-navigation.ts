import { BarChart3, BookOpen, Bot, Film, FolderKanban, HardDrive, ImagePlus, Images, LayoutDashboard, Settings, Users, Video } from "lucide-react";

export const workspaceLinks = [
  { label: "工作台", href: "/dashboard", icon: LayoutDashboard },
  { label: "创作项目", href: "/projects", icon: FolderKanban },
  { label: "素材库", href: "/assets", icon: Images },
  { label: "图片生成", href: "/generate/image", icon: ImagePlus },
  { label: "视频生成", href: "/generate/video", icon: Video },
];
export const projectLinks = [
  { label: "项目概览", href: "", icon: LayoutDashboard },
  { label: "剧本", href: "/scripts", icon: BookOpen },
  { label: "分镜", href: "/storyboards", icon: Film },
  { label: "项目素材", href: "/assets", icon: Images },
  { label: "项目设置", href: "/settings", icon: Settings },
];
export const settingsLinks = [
  { label: "个人设置", href: "/settings/profile", icon: Users, admin: false },
  { label: "智能体", href: "/settings/agents", icon: Bot, admin: false },
  { label: "模型配置", href: "/settings/ai-models", icon: Bot, admin: true },
  { label: "存储配置", href: "/settings/storage", icon: HardDrive, admin: true },
  { label: "用户管理", href: "/settings/users", icon: Users, admin: true },
  { label: "通用设置", href: "/settings/general", icon: Settings, admin: true },
];
export const analyticsLink = { label: "数据分析", href: "/dashboard/analytics", icon: BarChart3 };
