"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bot, Menu, MessageSquarePlus, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuthStore } from "@/lib/store/auth-store";
import { useAssistantStore } from "@/lib/store/assistant-store";
import { useAssistantAttachmentStore } from "@/lib/store/assistant-attachment-store";
import { setWorkspacePreference, WORKSPACE_ASSISTANT_COOKIE } from "@/lib/workspace-preferences";
import { AssistantComposer } from "./composer";
import { AssistantMessageList } from "./message-list";
import { ConversationNavigation } from "./conversation-navigation";
import { WorkspaceAssistantWelcome } from "./workspace-assistant-welcome";
import { subscribeToAssistantOpenRequest } from "./open-assistant";

const desktopQuery = "(min-width: 1280px)";
function subscribeDesktop(listener: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function AssistantContent({ projectId }: { projectId: number | null }) {
  const selectedId = useAssistantStore((state) => state.selectedConversationId);
  const initialized = useAssistantStore((state) => state.initialized);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputHeight, setInputHeight] = useState(0);

  return (
    <div className="assistant-shell relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/20 p-3">
        <Button variant="ghost" size="sm" onClick={() => useAssistantStore.getState().setDrawerOpen(true)}><Menu />会话</Button>
        <Button variant="ghost" size="icon-sm" aria-label="新建对话" onClick={() => useAssistantStore.getState().startNewConversation()}><MessageSquarePlus /></Button>
      </div>
      <div className="relative flex min-h-0 flex-1">
        <ConversationNavigation onSelected={() => useAssistantStore.getState().setDrawerOpen(false)} />
        <section className="assistant-content relative flex min-w-0 flex-1 flex-col">
          {selectedId
            ? <AssistantMessageList key={selectedId} conversationId={selectedId} inputHeight={inputHeight} />
            : <WorkspaceAssistantWelcome inputRef={inputRef} bottomInset={inputHeight} />}
          <AssistantComposer active={initialized} tooltipsEnabled projectId={projectId} inputRef={inputRef} onHeightChange={setInputHeight} />
        </section>
      </div>
    </div>
  );
}

export function WorkspaceAssistant({ projectId, initiallyCollapsed }: { projectId: number | null; initiallyCollapsed: boolean }) {
  const userId = useAuthStore((state) => state.user?.id);
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => false);
  const [collapsed, updateCollapsed] = useState(initiallyCollapsed);
  const setCollapsed = useCallback((value: boolean) => {
    updateCollapsed(value);
    setWorkspacePreference(WORKSPACE_ASSISTANT_COOKIE, value);
  }, []);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const state = useAssistantStore.getState();
    useAssistantAttachmentStore.getState().resetForUser(userId);
    state.initializeForUser(userId);
    return () => {
      useAssistantStore.getState().resetForUser();
      useAssistantAttachmentStore.getState().resetForUser(null);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    useAssistantStore.getState().setMode(desktop && !collapsed ? "docked" : mobileOpen ? "maximized" : "collapsed", desktop);
  }, [desktop, collapsed, mobileOpen, userId]);

  useEffect(() => subscribeToAssistantOpenRequest(() => {
    if (desktop) setCollapsed(false);
    else setMobileOpen(true);
  }), [desktop, setCollapsed]);

  return (
    <>
      <aside aria-label="AI 创作助手" className={`hidden h-full min-h-0 shrink-0 pb-3 pr-3 xl:flex ${collapsed ? "w-16" : "w-96"}`}>
        {collapsed ? (
          <Button variant="ghost" size="icon" aria-label="展开 AI 助手" onClick={() => setCollapsed(false)}><PanelRightOpen /></Button>
        ) : (
          <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border/30 bg-card">
            <div className="flex shrink-0 items-center justify-between gap-2 p-4">
              <div className="flex items-center gap-2"><Bot className="size-4 text-primary" /><span className="text-sm font-semibold">AI 创作助手</span></div>
              <Button variant="ghost" size="icon-sm" aria-label="收起 AI 助手" onClick={() => setCollapsed(true)}><PanelRightClose /></Button>
            </div>
            {desktop && userId && <AssistantContent projectId={projectId} />}
          </div>
        )}
      </aside>
      <Sheet open={!desktop && mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="data-[side=right]:w-full sm:max-w-md overflow-hidden motion-reduce:transition-none">
          <SheetHeader className="shrink-0">
            <SheetTitle>AI 创作助手</SheetTitle>
            <SheetDescription>围绕当前项目编写剧本、规划分镜和生成素材。</SheetDescription>
          </SheetHeader>
          {!desktop && mobileOpen && userId && <AssistantContent projectId={projectId} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
