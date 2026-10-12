"use client";

import {
  useCallback,
  useMemo,
  useRef,
  type ClipboardEvent,
} from "react";
import type { AiModel } from "@/lib/api/ai-model";
import {
  attachmentCompatibilityError,
  multimodalCapabilitySummary,
  prepareAssistantAttachments,
} from "./assistant-multimodal";
import { useAuthStore } from "@/lib/store/auth-store";
import { attachmentDraftScope, EMPTY_ATTACHMENT_DRAFT, useAssistantAttachmentStore } from "@/lib/store/assistant-attachment-store";

interface UseAssistantAttachmentsOptions {
  conversationId: string | null;
  model: AiModel | null;
  onError: (error: unknown) => void;
}

export function useAssistantAttachments({
  conversationId,
  model,
  onError,
}: UseAssistantAttachmentsOptions) {
  const userId = useAuthStore((state) => state.user?.id);
  const scope = attachmentDraftScope(conversationId);
  const draft = useAssistantAttachmentStore((state) => state.userId === userId
    ? state.drafts[scope] ?? EMPTY_ATTACHMENT_DRAFT : EMPTY_ATTACHMENT_DRAFT);
  const { attachments, uploading, error } = draft;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    if (!model) throw new Error("请先选择对话模型");
    if (!userId) throw new Error("请先登录");
    try {
      await useAssistantAttachmentStore.getState().prepare(userId, scope,
        (existing) => prepareAssistantAttachments(files, model, existing));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [model, scope, userId]);

  const removeAttachment = useCallback((id: string) => {
    if (userId) useAssistantAttachmentStore.getState().remove(userId, scope, id);
  }, [scope, userId]);

  const clearAttachments = useCallback(() => {
    if (userId) useAssistantAttachmentStore.getState().clear(userId, scope);
  }, [scope, userId]);

  const handlePaste = useCallback((event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);
    if (!files.length) return;
    event.preventDefault();
    void addFiles(files).catch(onError);
  }, [addFiles, onError]);

  const accept = useMemo(() => {
    const types = model?.multimodalInputTypes ?? [];
    return [
      types.includes("image") ? "image/*" : null,
      types.includes("video") ? "video/*" : null,
      types.includes("audio") ? "audio/*" : null,
      types.includes("file") ? ".pdf,.txt,.md,.csv,.json" : null,
    ].filter(Boolean).join(",");
  }, [model]);

  return {
    attachments,
    uploading,
    error,
    fileInputRef,
    accept,
    compatibilityError: attachmentCompatibilityError(model, attachments),
    capabilitySummary: multimodalCapabilitySummary(model),
    canAdd: !!model?.multimodalInputTypes.length,
    addFiles,
    removeAttachment,
    clearAttachments,
    handlePaste,
  };
}
