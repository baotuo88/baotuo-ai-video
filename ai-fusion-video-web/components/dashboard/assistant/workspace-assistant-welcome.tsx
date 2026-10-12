"use client";

import type { RefObject } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OverlayScrollArea } from "@/components/dashboard/overlay-scroll-area";
import { useAssistantStore } from "@/lib/store/assistant-store";

export function WorkspaceAssistantWelcome({ inputRef, bottomInset }: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  bottomInset: number;
}) {
  return (
    <OverlayScrollArea className="min-h-0 flex-1" viewportStyle={{ paddingBottom: bottomInset }}>
      <div className="flex flex-col gap-6 p-5">
        <div className="flex flex-col gap-3">
          <Bot className="size-8 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">从一个创意开始</h2>
          <p className="text-sm leading-6 text-muted-foreground">描述你想制作的视频，或引用项目，让助手协助创作。</p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => {
          const prompt = "帮我把创意整理成视频脚本";
          useAssistantStore.getState().setDraft(null, prompt);
          inputRef.current?.focus({ preventScroll: true });
        }}>开始构思</Button>
      </div>
    </OverlayScrollArea>
  );
}
