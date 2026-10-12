import {
  type Asset
} from "@/lib/api/asset";

export const typeColorMap: Record<string, string> = {
  character: "text-blue-400 bg-blue-500/10",
  scene: "text-green-400 bg-green-500/10",
  prop: "text-amber-400 bg-amber-500/10",
};

export const typeLabelMap: Record<string, string> = {
  character: "角色",
  scene: "场景",
  prop: "道具",
};

export const LONG_TEXT_KEYS = new Set(["description", "relationship", "appearance", "personality"]);

export function parseProps(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  if (typeof raw === "object") return raw as Record<string, string>;
  return {};
}

export const assetTypeOptions = [
  { value: "character", label: "角色" },
  { value: "scene", label: "场景" },
  { value: "prop", label: "道具" },
];

export const itemTypeOptions = [
  { value: "initial", label: "初始图" },
  { value: "three_view", label: "三视图" },
  { value: "variant", label: "变体" },
];

export interface EditProps {
  isCreating?: false;
  asset: Asset;
  projectId?: never;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onCreated?: never;
}

export interface CreateProps {
  isCreating: true;
  asset?: never;
  projectId: number;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: never;
  onCreated: (created: Asset) => void;
}

export type Props = EditProps | CreateProps;
