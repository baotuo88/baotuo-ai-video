"use client";

import { Clapperboard, Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoryboardEpisode } from "@/lib/api/storyboard";

interface StoryboardComposeActionsProps {
  episode: StoryboardEpisode | null;
  submitting: boolean;
  running: boolean;
  onCompose: () => Promise<void>;
  onPreview: (url: string) => void;
}

export function StoryboardComposeActions({
  episode, submitting, running, onCompose, onPreview,
}: StoryboardComposeActionsProps) {
  if (!episode) return null;
  const busy = submitting || running || episode.composeStatus === 1;
  const videoUrl = episode.composedVideoUrl;
  return (
    <div className="hidden shrink-0 gap-2 sm:flex">
      {episode.composeStatus === 2 && videoUrl && (
        <Button variant="outline" size="sm" onClick={() => onPreview(videoUrl)} title="预览本集合成视频">
          <PlayCircle />
          预览
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={onCompose}
        title={episode.composeStatus === 3 ? episode.composeErrorMsg || "重试本集合成" : "按镜头顺序合成本集视频"}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Clapperboard />}
        {submitting ? "提交中" : busy ? "合成中" : episode.composeStatus === 3 ? "重试" : videoUrl ? "重新合成" : "合成"}
      </Button>
    </div>
  );
}
