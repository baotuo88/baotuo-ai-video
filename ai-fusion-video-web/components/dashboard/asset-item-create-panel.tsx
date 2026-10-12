"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api/api-error";
import {
  assetApi,
  type FieldDef
} from "@/lib/api/asset";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Plus,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { itemTypeOptions, LONG_TEXT_KEYS } from "./asset-detail-data";

export function AssetItemCreatePanel({
  assetId,
  assetType,
  onClose,
  onCreated,
}: {
  assetId: number;
  assetType: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState("");
  const [creating, setCreating] = useState(false);
  const [newItemProperties, setNewItemProperties] = useState<Record<string, string>>({});
  const [newItemFields, setNewItemFields] = useState<FieldDef[]>([]);
  const [newItemMetaLoading, setNewItemMetaLoading] = useState(false);

  useEffect(() => {
    if (!assetType) return;
    let cancelled = false;
    (async () => {
      try {
        setNewItemMetaLoading(true);
        const resp = await assetApi.getMetadata(assetType);
        if (!cancelled) setNewItemFields(resp.fields || []);
      } catch {
        if (!cancelled) setNewItemFields([]);
      } finally {
        if (!cancelled) setNewItemMetaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assetType]);

  const handleNewItemPropertyChange = (key: string, value: string) => {
    setNewItemProperties((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      setCreating(true);
      await assetApi.createItem({
        assetId,
        name: name.trim(),
        itemType: itemType || undefined,
        properties: JSON.stringify(newItemProperties),
      });
      onCreated();
    } catch (err) {
      console.error("创建子资产失败:", err);
      toast.error(getApiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-card/60 backdrop-blur-sm shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">新建子资产</h3>
        </div>
        <button
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
            name.trim()
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
              : "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
          )}
        >
          {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          创建
        </button>
      </div>

      {/* 创建表单 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-5">
        {/* 基本信息 */}
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary" />
            基本信息
          </h4>
          <div className="rounded-xl border border-border/30 bg-card/40 p-3.5 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">名称</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="子资产名称"
                className="h-8 text-xs"
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">类型</label>
              <Select value={itemType || ""} onValueChange={(v) => { if (v) setItemType(v); }} items={itemTypeOptions}>
                <SelectTrigger size="sm" className="text-xs">
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectGroup>
                    {itemTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* 自定义属性 */}
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-purple-400" />
            属性
            {newItemMetaLoading && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
          </h4>
          {newItemFields.length === 0 && !newItemMetaLoading ? (
            <div className="rounded-xl border border-dashed border-border/30 py-5 flex justify-center">
              <p className="text-[11px] text-muted-foreground/40">该类型无可编辑属性</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/30 bg-card/40 p-3.5 grid grid-cols-1 gap-3">
              {newItemFields.map((fd) => (
                <div key={fd.key} className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium flex items-center gap-0.5">
                    {fd.label}
                    {fd.required && <span className="text-orange-400 text-[10px]">*</span>}
                  </label>
                  {fd.type === "select" && fd.options ? (
                    <Select
                      value={newItemProperties[fd.key] || ""}
                      onValueChange={(v) => handleNewItemPropertyChange(fd.key, v ?? "")}
                      items={fd.options}
                    >
                      <SelectTrigger size="sm" className="text-xs">
                        <SelectValue placeholder="选择" />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectGroup>
                          {fd.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : LONG_TEXT_KEYS.has(fd.key) ? (
                    <Textarea
                      value={newItemProperties[fd.key] || ""}
                      onChange={(e) => handleNewItemPropertyChange(fd.key, e.target.value)}
                      placeholder={fd.label}
                      rows={3}
                      className="resize-none text-xs leading-relaxed"
                    />
                  ) : (
                    <Input
                      value={newItemProperties[fd.key] || ""}
                      onChange={(e) => handleNewItemPropertyChange(fd.key, e.target.value)}
                      placeholder={fd.label}
                      className="h-8 text-xs"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
