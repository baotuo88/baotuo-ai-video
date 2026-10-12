import { create } from "zustand";
import type { AssistantAttachment } from "@/components/dashboard/assistant/assistant-multimodal";

export interface AttachmentDraft {
  attachments: AssistantAttachment[];
  uploading: boolean;
  error: string | null;
  revision: number;
}

export const EMPTY_ATTACHMENT_DRAFT: AttachmentDraft = {
  attachments: [], uploading: false, error: null, revision: 0,
};

interface AttachmentDraftState {
  userId: number | null;
  session: number;
  drafts: Record<string, AttachmentDraft>;
  resetForUser: (userId: number | null) => void;
  prepare: (userId: number, scope: string, producer: (existing: AssistantAttachment[]) => Promise<AssistantAttachment[]>) => Promise<void>;
  remove: (userId: number, scope: string, id: string) => void;
  clear: (userId: number, scope: string) => void;
}

export function createAssistantAttachmentStore() {
  return create<AttachmentDraftState>((set, get) => ({
    userId: null,
    session: 0,
    drafts: {},
    resetForUser: (userId) => set((state) => ({ userId, session: state.session + 1, drafts: {} })),
    prepare: async (userId, scope, producer) => {
      const state = get();
      if (state.userId !== userId) throw new Error("登录状态已变化，请重新添加附件");
      const draft = state.drafts[scope] ?? EMPTY_ATTACHMENT_DRAFT;
      if (draft.uploading) throw new Error("附件正在处理中，请稍候");
      const session = state.session;
      const revision = draft.revision;
      const current = () => {
        const latest = get();
        return latest.userId === userId && latest.session === session
          && latest.drafts[scope]?.revision === revision;
      };
      set({ drafts: { ...state.drafts, [scope]: { ...draft, uploading: true, error: null } } });
      try {
        const attachments = await producer(draft.attachments);
        if (!current()) return;
        set((latest) => ({ drafts: { ...latest.drafts, [scope]: {
          ...latest.drafts[scope],
          attachments: [...latest.drafts[scope].attachments, ...attachments],
          uploading: false,
        } } }));
      } catch (error) {
        if (!current()) return;
        set((latest) => ({ drafts: { ...latest.drafts, [scope]: {
          ...latest.drafts[scope], uploading: false,
          error: error instanceof Error ? error.message : "添加附件失败",
        } } }));
        throw error;
      }
    },
    remove: (userId, scope, id) => {
      const state = get();
      if (state.userId !== userId || !state.drafts[scope]) return;
      const draft = state.drafts[scope];
      set({ drafts: { ...state.drafts, [scope]: {
        ...draft, error: null, attachments: draft.attachments.filter((item) => item.id !== id),
      } } });
    },
    clear: (userId, scope) => {
      const state = get();
      if (state.userId !== userId) return;
      const revision = (state.drafts[scope]?.revision ?? 0) + 1;
      set({ drafts: { ...state.drafts, [scope]: { ...EMPTY_ATTACHMENT_DRAFT, revision } } });
    },
  }));
}

export const useAssistantAttachmentStore = createAssistantAttachmentStore();

export function attachmentDraftScope(conversationId: string | null) {
  return conversationId === null ? "new" : `conversation:${conversationId}`;
}
