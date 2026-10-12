"use client";

import { useParams } from "next/navigation";
import { useStoryboardWorkspace } from "./_hooks/use-storyboard-workspace";
import { StoryboardWorkspace } from "./_components/storyboard-workspace";

export default function StoryboardTabPage() {
  const params = useParams();
  const workspace = useStoryboardWorkspace(Number(params.id));
  return <StoryboardWorkspace workspace={workspace} />;
}
