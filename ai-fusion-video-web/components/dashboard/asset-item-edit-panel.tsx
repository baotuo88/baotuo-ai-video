"use client";

import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SafeImage } from "@/components/ui/safe-image";
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
  type AssetItem,
  type FieldDef
} from "@/lib/api/asset";
import { resolveMediaUrl } from "@/lib/api/client";
import { uploadFile } from "@/lib/api/storage";
import { usePipelineStore } from "@/lib/store/pipeline-store";
import { cn } from "@/lib/utils";
import {
  Check,
  Images,
  Link,
  Loader2,
  Maximize2,
  Sparkles,
  Trash2,
  Upload,
  X
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { itemTypeOptions, LONG_TEXT_KEYS, parseProps } from "./asset-detail-data";
import { ImageLightbox } from "./asset-image-lightbox";

export function AssetItemEditPanel({
  confirm,
  item,
  assetId,
  assetType,
  projectId,
  onClose,
  onUpdated,
  onDeleted,
}: {
  confirm: ReturnType<typeof useConfirm>["confirm"];
  item: AssetItem;
  assetId: number;
  assetType: string;
  projectId: number;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(item.name || "");
  const [itemType, setItemType] = useState(item.itemType || "");
  const [imageUrl, setImageUrl] = useState(item.imageUrl || "");
  const [itemProperties, setItemProperties] = useState<Record<string, string>>({});
  const [itemFields, setItemFields] = useState<FieldDef[]>([]);
  const [itemMetaLoading, setItemMetaLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(item.name || "");
    setItemType(item.itemType || "");
    setImageUrl(item.imageUrl || "");
    const p = parseProps(item.properties);
    setItemProperties(p);
    setDirty(false);
    setShowLightbox(false);
    setUrlMode(false);
  }, [item]);

  useEffect(() => {
    if (!assetType) return;
    let cancelled = false;
    (async () => {
      try {
        setItemMetaLoading(true);
        const resp = await assetApi.getMetadata(assetType);
        if (!cancelled) setItemFields(resp.fields || []);
      } catch {
        if (!cancelled) setItemFields([]);
      } finally {
        if (!cancelled) setItemMetaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assetType]);

  const handleItemPropertyChange = (key: string, value: string) => {
    setItemProperties((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await assetApi.updateItem({
        id: item.id,
        name: name || undefined,
        itemType: itemType || undefined,
        imageUrl: imageUrl || undefined,
        properties: JSON.stringify(itemProperties),
      });
      setDirty(false);
      onUpdated();
    } catch (err) {
      console.error("更新子资产失败:", err);
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: "删除子资产", description: "确定删除该子资产吗？此操作无法撤销。", variant: "destructive", confirmText: "确定删除" }); if (!ok) return;
    try {
      await assetApi.deleteItem(item.id);
      onDeleted();
    } catch (err) {
      console.error("删除子资产失败:", err);
      toast.error(getApiErrorMessage(err));
    }
  };

  const uploadItemImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      setUploading(true);
      const uploadedUrl = await uploadFile(file, "assets");
      setImageUrl(uploadedUrl);
      setDirty(true);
    } catch (err) {
      console.error("上传子资产图片失败:", err);
      toast.error(getApiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void uploadItemImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    void uploadItemImage(file);
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
          <h3 className="text-sm font-semibold truncate">{item.name || "未命名子资产"}</h3>
          <span className="text-[10px] text-muted-foreground/50">子资产编辑</span>
        </div>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground/40"
          title="删除子资产"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleSave}
          disabled={!dirty || saving || uploading}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
            dirty
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
              : "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
          )}
        >
          {saving || uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          保存
        </button>
      </div>

      {/* 编辑内容 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-5">
        {/* 图片预览 */}
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-orange-400" />
            图片
          </h4>
          <div
            className="group/img relative aspect-square w-full rounded-xl border border-border/30 overflow-hidden bg-muted/5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {imageUrl ? (
            <SafeImage
              src={resolveMediaUrl(imageUrl) || undefined}
              alt={name || "子资产图片"}
              className="w-full h-full object-contain"
              fallbackType={
                assetType === "character"
                  ? "avatar"
                  : assetType === "scene"
                  ? "scene"
                  : assetType === "prop"
                  ? "prop"
                  : "image"
              }
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/20">
              <Images className="h-8 w-8 mb-1" />
              <p className="text-[10px]">拖拽图片到此处</p>
            </div>
          )}

          {/* 悬浮操作遮罩 */}
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover/img:opacity-100 z-20">
            {imageUrl && (
              <button
                onClick={() => setShowLightbox(true)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-white/15 text-white/90 hover:bg-white/25 backdrop-blur-sm transition-all text-[10px] font-medium"
                title="查看大图"
              >
                <Maximize2 className="h-4 w-4" />
                大图
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-white/15 text-white/90 hover:bg-white/25 backdrop-blur-sm transition-all text-[10px] font-medium"
              title="上传图片"
            >
              <Upload className="h-4 w-4" />
              上传
            </button>
            <button
              onClick={() => {
                const { addPipeline, setNotificationOpen } = usePipelineStore.getState();
                addPipeline({
                  label: `生成图片: ${item.name || '子资产'}`,
                  projectId,
                  request: {
                    agentType: 'asset_image_gen',
                    toolExecutionMode: 'FULL_ACCESS',
                    projectId,
                    context: {
                      selectedAssetIds: [assetId],
                      selectedAssetItemIds: [item.id],
                    },
                  },
                  onComplete: () => {
                    onUpdated();
                  },
                });
                setNotificationOpen(true);
              }}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-white/15 text-white/90 hover:bg-white/25 backdrop-blur-sm transition-all text-[10px] font-medium"
              title="AI 生图"
            >
              <Sparkles className="h-4 w-4" />
              生图
            </button>
          </div>

          {/* 隐藏文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          </div>
        </section>

        {/* URL 输入切换 */}
        <div className="space-y-1">
          <button
            onClick={() => setUrlMode(!urlMode)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <Link className="h-2.5 w-2.5" />
            {urlMode ? "收起链接" : "使用链接"}
          </button>
          {urlMode && (
            <Input
              value={imageUrl}
              onChange={(e) => { setImageUrl(e.target.value); setDirty(true); }}
              placeholder="粘贴图片链接..."
              className="h-7 text-xs"
            />
          )}
        </div>

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
                onChange={(e) => { setName(e.target.value); setDirty(true); }}
                placeholder="子资产名称"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">类型</label>
              <Select value={itemType || ""} onValueChange={(v) => { if (v) { setItemType(v); setDirty(true); } }} items={itemTypeOptions}>
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
            {itemMetaLoading && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
          </h4>
          {itemFields.length === 0 && !itemMetaLoading ? (
            <div className="rounded-xl border border-dashed border-border/30 py-5 flex justify-center">
              <p className="text-[11px] text-muted-foreground/40">该类型无可编辑属性</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/30 bg-card/40 p-3.5 grid grid-cols-1 gap-3">
              {itemFields.map((fd) => (
                <div key={fd.key} className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium flex items-center gap-0.5">
                    {fd.label}
                    {fd.required && <span className="text-orange-400 text-[10px]">*</span>}
                  </label>
                  {fd.type === "select" && fd.options ? (
                    <Select
                      value={itemProperties[fd.key] || ""}
                      onValueChange={(v) => handleItemPropertyChange(fd.key, v ?? "")}
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
                      value={itemProperties[fd.key] || ""}
                      onChange={(e) => handleItemPropertyChange(fd.key, e.target.value)}
                      placeholder={fd.label}
                      rows={3}
                      className="resize-none text-xs leading-relaxed"
                    />
                  ) : (
                    <Input
                      value={itemProperties[fd.key] || ""}
                      onChange={(e) => handleItemPropertyChange(fd.key, e.target.value)}
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

      {/* 大图弹窗 */}
      {showLightbox && imageUrl && (
        <ImageLightbox
          src={resolveMediaUrl(imageUrl) || ""}
          alt={name || "子资产图片"}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </div>
  );
}
