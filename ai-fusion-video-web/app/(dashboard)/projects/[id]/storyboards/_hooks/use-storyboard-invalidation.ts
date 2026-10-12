"use client";

import { useEffect, useRef } from "react";
import { usePipelineStore } from "@/lib/store/pipeline-store";
import { createStoryboardRefreshCoordinator } from "@/lib/storyboard-refresh";

export function useStoryboardInvalidation(projectId: number, refresh: () => Promise<void>) {
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const coordinator = createStoryboardRefreshCoordinator(() => refreshRef.current());
    const unsubscribe = usePipelineStore.subscribe((state, previous) => {
      coordinator.update(
        state.invalidation.storyboards !== previous.invalidation.storyboards,
        state.tasks.some((task) => task.projectId === projectId && task.status === "running"),
      );
    });
    return () => {
      unsubscribe();
      coordinator.dispose();
    };
  }, [projectId]);
}
