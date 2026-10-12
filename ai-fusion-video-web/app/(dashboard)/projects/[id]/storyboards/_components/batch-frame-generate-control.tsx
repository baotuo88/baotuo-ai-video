"use client";

import type { StoryboardItem } from "@/lib/api/storyboard";
import { cn } from "@/lib/utils";
import {
  Image as ImageIcon
} from "lucide-react";
import { useState } from "react";
import { BatchFrameGenDialog } from "./batch-frame-gen-dialog";
import { BatchFrameGenerateHandler } from "./storyboard-reference-data";

export function BatchFrameGenerateControl({
  items,
  loading,
  currentEpisodeId,
  currentSceneId,
  onConfirm,
}: {
  items: StoryboardItem[];
  loading?: boolean;
  currentEpisodeId?: number | null;
  currentSceneId?: number | null;
  onConfirm?: BatchFrameGenerateHandler;
}) {
  const [open, setOpen] = useState(false);
  const disabledReason =
    currentSceneId == null
      ? "请先选择场次"
      : currentEpisodeId == null
        ? "缺少分镜集上下文"
        : loading
          ? "正在加载当前场次镜头"
          : items.length === 0
            ? "当前场次暂无镜头"
            : !onConfirm
              ? "当前页面暂不支持批量生成"
              : null;
  const disabled = !!disabledReason;

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen(true);
          }
        }}
        disabled={disabled}
        title={disabledReason || "批量生成当前场次全部镜头的首尾帧"}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all",
          disabled
            ? "bg-muted/30 text-muted-foreground cursor-not-allowed"
            : "bg-linear-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
        )}
      >
        <ImageIcon className="h-3.5 w-3.5" />
        批量生成首尾帧
      </button>
      {disabledReason && (
        <p className="text-[10px] text-muted-foreground/70 text-center">
          {disabledReason}
        </p>
      )}
      {onConfirm && currentEpisodeId != null && currentSceneId != null && (
        <BatchFrameGenDialog
          key={open ? "batch-frame-open" : "batch-frame-closed"}
          open={open}
          items={items}
          episodeId={currentEpisodeId}
          sceneId={currentSceneId}
          onClose={() => setOpen(false)}
          onConfirm={onConfirm}
        />
      )}
    </div>
  );
}
