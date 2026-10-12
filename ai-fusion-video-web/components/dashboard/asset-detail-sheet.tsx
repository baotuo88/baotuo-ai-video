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
import { cn } from "@/lib/utils";
import {
  Images,
  Library,
  Link,
  Loader2,
  Maximize2,
  Plus,
  Save,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CoverSelectorDialog } from "./asset-cover-selector-dialog";
import { assetTypeOptions, itemTypeOptions, LONG_TEXT_KEYS, parseProps, Props, typeColorMap, typeLabelMap } from "./asset-detail-data";
import { ImageLightbox } from "./asset-image-lightbox";
import { AssetItemCreatePanel } from "./asset-item-create-panel";
import { AssetItemEditPanel } from "./asset-item-edit-panel";

export default function AssetDetailPanel(props: Props) {
  const { confirm } = useConfirm();
  const { onClose, onSaved } = props;
  const isCreating = props.isCreating === true;
  const asset = isCreating ? null : props.asset;

  // 创建模式的状态
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState("character");
  const [createDescription, setCreateDescription] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  // 编辑模式的状态
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [items, setItems] = useState<AssetItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [showCoverLightbox, setShowCoverLightbox] = useState(false);
  const [isCoverSelectorOpen, setIsCoverSelectorOpen] = useState(false);
  const [coverUrlMode, setCoverUrlMode] = useState(false);

  // 选中的子资产 / 创建子资产模式
  const [selectedItem, setSelectedItem] = useState<AssetItem | null>(null);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const isItemPanelOpen = !!selectedItem || isCreatingItem;

  useEffect(() => {
    if (!asset) return;
    setName(asset.name);
    setDescription(asset.description || "");
    setCoverUrl(asset.coverUrl || "");
    const p = parseProps(asset.properties);
    setProperties(p);
    setDirty(false);
    setSelectedItem(null);
    setIsCreatingItem(false);
    loadMetadata(asset.type);
    loadItems(asset.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.id]);

  const loadMetadata = useCallback(async (type: string) => {
    try {
      setMetaLoading(true);
      const resp = await assetApi.getMetadata(type);
      setFields(resp.fields || []);
    } catch {
      setFields([]);
    } finally {
      setMetaLoading(false);
    }
  }, []);

  const loadItems = useCallback(async (assetId: number) => {
    try {
      setItemsLoading(true);
      const data = await assetApi.listItems(assetId);
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  const handlePropertyChange = (key: string, value: string) => {
    setProperties((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const uploadCoverImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      setCoverUploading(true);
      const uploadedUrl = await uploadFile(file, "assets");
      setCoverUrl(uploadedUrl);
      setDirty(true);
    } catch (err) {
      console.error("上传资产封面失败:", err);
      toast.error(getApiErrorMessage(err));
    } finally {
      setCoverUploading(false);
    }
  }, []);

  const handleSave = async () => {
    if (!asset) return;
    try {
      setSaving(true);
      await assetApi.update({
        id: asset.id,
        name,
        description: description || undefined,
        coverUrl: coverUrl || undefined,
        properties: JSON.stringify(properties),
      });
      setDirty(false);
      onSaved();
    } catch (err) {
      console.error("保存资产失败:", err);
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!asset || !props.onDeleted) return;
    const ok = await confirm({ title: "删除主资产", description: "确定要删除该资产及其所有子资产吗？此操作无法撤销。", variant: "destructive", confirmText: "确定删除" }); if (!ok) return;
    try {
      await assetApi.delete(asset.id);
      props.onDeleted();
    } catch (err) {
      console.error("删除资产失败:", err);
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleCreate = async () => {
    if (!isCreating || !createName.trim()) return;
    try {
      setCreateSaving(true);
      const created = await assetApi.create({
        projectId: props.projectId,
        type: createType,
        name: createName.trim(),
        description: createDescription || undefined,
      });
      props.onCreated(created);
    } catch (err) {
      console.error("创建资产失败:", err);
      toast.error(getApiErrorMessage(err));
    } finally {
      setCreateSaving(false);
    }
  };

  const typeColor = asset ? (typeColorMap[asset.type] || "text-muted-foreground bg-muted/50") : "";

  // ========== 创建模式 ==========
  if (isCreating) {
    return (
      <div className="h-full flex flex-col">
        {/* 头部 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20 shrink-0">
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">新建资产</h3>
          </div>
          <button
            onClick={handleCreate}
            disabled={!createName.trim() || createSaving}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              createName.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
            )}
          >
            {createSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            创建
          </button>
        </div>

        {/* 表单 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">名称</label>
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="资产名称"
              className="h-8 text-xs"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">类型</label>
            <Select value={createType} onValueChange={(v) => { if (v) setCreateType(v); }} items={assetTypeOptions}>
              <SelectTrigger size="sm" className="text-xs">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectGroup>
                  {assetTypeOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">描述</label>
            <Textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="资产描述（可选）..."
              rows={3}
              className="resize-none text-xs"
            />
          </div>
        </div>
      </div>
    );
  }

  // ========== 编辑模式 ==========
  if (!asset) return null;

  return (
    <div className="h-full relative overflow-hidden">
      {/* ======= 左侧：主资产编辑 ======= */}
      <div
        className="h-full flex flex-col min-h-0 overflow-hidden border-r border-border/20 transition-all duration-400 ease-in-out"
        style={{ width: isItemPanelOpen ? "50%" : "100%" }}
      >
        {/* 头部 */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/30 bg-card/60 backdrop-blur-sm shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">{asset.name}</h3>
            <span className={cn("inline-block px-1.5 py-0.5 rounded text-[9px] leading-none mt-0.5 font-medium", typeColor)}>
              {typeLabelMap[asset.type] || asset.type}
            </span>
          </div>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground/40"
            title="删除资产"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving || coverUploading}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              dirty
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
                : "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
            )}
          >
            {saving || coverUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            保存
          </button>
        </div>

        {/* 滚动内容 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6">
          {/* ======= 基本信息 ======= */}
          <section className="space-y-3">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              基本信息
            </h4>
            <div className="rounded-xl border border-border/30 bg-card/40 p-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">名称</label>
                <Input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setDirty(true); }}
                  placeholder="资产名称"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">描述</label>
                <Textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setDirty(true); }}
                  placeholder="资产描述..."
                  rows={3}
                  className="resize-none text-xs leading-relaxed"
                />
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-orange-400" />
                封面
              </h4>
              <div
                className="group/cover relative h-[280px] w-full rounded-xl border border-border/30 overflow-hidden bg-muted/5"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (!file || !file.type.startsWith("image/")) return;
                  void uploadCoverImage(file);
                }}
              >
                {coverUrl ? (
                  <SafeImage
                    src={resolveMediaUrl(coverUrl) || undefined}
                    alt={name || "封面"}
                    className="w-full h-full object-contain"
                    fallbackType={
                      asset?.type === "character"
                        ? "avatar"
                        : asset?.type === "scene"
                        ? "scene"
                        : asset?.type === "prop"
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
                <div className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover/cover:opacity-100 z-20">
                  {coverUrl && (
                    <button
                      onClick={() => setShowCoverLightbox(true)}
                      className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-white/15 text-white/90 hover:bg-white/25 backdrop-blur-sm transition-all text-[10px] font-medium"
                      title="查看大图"
                    >
                      <Maximize2 className="h-4 w-4" />
                      大图
                    </button>
                  )}
                  <button
                    onClick={() => setIsCoverSelectorOpen(true)}
                    className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-white/15 text-white/90 hover:bg-white/25 backdrop-blur-sm transition-all text-[10px] font-medium"
                    title="从资料库"
                  >
                    <Library className="h-4 w-4" />
                    资料库
                  </button>
                  <button
                    onClick={() => coverFileRef.current?.click()}
                    className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-white/15 text-white/90 hover:bg-white/25 backdrop-blur-sm transition-all text-[10px] font-medium"
                    title="上传图片"
                  >
                    <Upload className="h-4 w-4" />
                    上传
                  </button>
                </div>
                <input
                  ref={coverFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    void uploadCoverImage(file);
                  }}
                />
              </div>
              {/* URL 输入切换 */}
              <div className="space-y-1">
                <button
                  onClick={() => setCoverUrlMode(!coverUrlMode)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  <Link className="h-2.5 w-2.5" />
                  {coverUrlMode ? "收起链接" : "使用链接"}
                </button>
                {coverUrlMode && (
                  <Input
                    value={coverUrl}
                    onChange={(e) => { setCoverUrl(e.target.value); setDirty(true); }}
                    placeholder="粘贴封面图片链接..."
                    className="h-7 text-xs"
                  />
                )}
              </div>
            </div>
            {/* 大图弹窗 */}
            {showCoverLightbox && coverUrl && (
              <ImageLightbox
                src={resolveMediaUrl(coverUrl) || ""}
                alt={name || "封面"}
                onClose={() => setShowCoverLightbox(false)}
              />
            )}
          </section>

          {/* ======= 动态属性 ======= */}
          <section className="space-y-3">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-purple-400" />
              属性
              {metaLoading && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
            </h4>
            {fields.length === 0 && !metaLoading ? (
              <div className="rounded-xl border border-dashed border-border/30 py-6 flex justify-center">
                <p className="text-[11px] text-muted-foreground/40">该类型无可编辑属性</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/30 bg-card/40 p-4 grid grid-cols-2 gap-3">
                {fields.map((fd) => (
                  <div
                    key={fd.key}
                    className={cn(
                      "space-y-1",
                      (fd.key === "description" || fd.key === "relationship" || fd.key === "appearance" || fd.key === "personality")
                        ? "col-span-2" : ""
                    )}
                  >
                    <label className="text-xs text-muted-foreground font-medium flex items-center gap-0.5">
                      {fd.label}
                      {fd.required && <span className="text-orange-400 text-[10px]">*</span>}
                    </label>
                    {fd.type === "select" && fd.options ? (
                      <Select
                        value={properties[fd.key] || ""}
                        onValueChange={(v) => handlePropertyChange(fd.key, v ?? "")}
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
                        value={properties[fd.key] || ""}
                        onChange={(e) => handlePropertyChange(fd.key, e.target.value)}
                        placeholder={fd.label}
                        rows={3}
                        className="resize-none text-xs leading-relaxed"
                      />
                    ) : (
                      <Input
                        value={properties[fd.key] || ""}
                        onChange={(e) => handlePropertyChange(fd.key, e.target.value)}
                        placeholder={fd.label}
                        className="h-8 text-xs"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ======= 子资产卡片列表 ======= */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-cyan-400" />
                子资产
                {itemsLoading && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
              </h4>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] text-muted-foreground/40 tabular-nums">{items.length} 个</span>
                <button
                  onClick={() => { setSelectedItem(null); setIsCreatingItem(true); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus className="h-2.5 w-2.5" />
                  新建
                </button>
              </div>
            </div>

            {/* 子资产卡片网格 */}
            {items.length === 0 && !itemsLoading ? (
              <div className="rounded-xl border border-dashed border-border/30 py-8 flex flex-col items-center text-muted-foreground/25">
                <Images className="h-6 w-6 mb-1.5" />
                <p className="text-[11px]">暂无子资产</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {items.map((item) => {
                  const isItemSelected = selectedItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group relative rounded-xl border cursor-pointer transition-all duration-200",
                        "bg-card/40 hover:bg-card/60 hover:shadow-sm",
                        isItemSelected
                          ? "border-primary/40 ring-1 ring-primary/20 shadow-sm shadow-primary/5"
                          : "border-border/30 hover:border-border/50"
                      )}
                      onClick={() => { setIsCreatingItem(false); setSelectedItem(item); }}
                    >
                      {/* 缩略图 */}
                      <div className="aspect-square overflow-hidden rounded-t-[7px]">
                        <SafeImage
                          src={resolveMediaUrl(item.thumbnailUrl || item.imageUrl) || undefined}
                          alt={item.name || ""}
                          className="w-full h-full object-cover"
                          fallbackType={
                            asset?.type === "character"
                              ? "avatar"
                              : asset?.type === "scene"
                              ? "scene"
                              : asset?.type === "prop"
                              ? "prop"
                              : "image"
                          }
                        />
                        {/* 删除按钮 */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await confirm({ title: "删除子资产", description: "确定删除该子资产吗？此操作无法撤销。", variant: "destructive", confirmText: "确定删除" }); if (!ok) return;
                            assetApi.deleteItem(item.id).then(() => {
                              if (selectedItem?.id === item.id) setSelectedItem(null);
                              loadItems(asset.id);
                            });
                          }}
                          className="absolute top-1 right-1 p-0.5 rounded bg-black/40 text-white/70 hover:bg-destructive hover:text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm z-10"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      {/* 信息 */}
                      <div className="px-2.5 py-2">
                        <p className="text-[11px] font-medium truncate">{item.name || "未命名"}</p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-foreground/5 text-muted-foreground/50">
                          {itemTypeOptions.find((o) => o.value === item.itemType)?.label || item.itemType || "未分类"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ======= 右侧：子资产编辑/创建面板（absolute 定位，从右侧滑入） ======= */}
      <div
        className={cn(
          "absolute top-0 right-0 h-full min-h-0 overflow-hidden bg-card/30",
          "transition-all duration-400 ease-in-out"
        )}
        style={{
          width: isItemPanelOpen ? "50%" : "0%",
          opacity: isItemPanelOpen ? 1 : 0,
        }}
      >
        {isCreatingItem ? (
          <AssetItemCreatePanel
            assetId={asset.id}
            assetType={asset.type}
            onClose={() => setIsCreatingItem(false)}
            onCreated={() => {
              setIsCreatingItem(false);
              loadItems(asset.id);
            }}
          />
        ) : selectedItem ? (
          <AssetItemEditPanel
            confirm={confirm}
            key={selectedItem.id}
            item={selectedItem}
            assetId={asset.id}
            assetType={asset.type}
            projectId={asset.projectId}
            onClose={() => setSelectedItem(null)}
            onUpdated={() => loadItems(asset.id)}
            onDeleted={() => {
              setSelectedItem(null);
              loadItems(asset.id);
            }}
          />
        ) : null}
      </div>

      <CoverSelectorDialog 
        open={isCoverSelectorOpen} 
        onOpenChange={setIsCoverSelectorOpen} 
        projectId={asset.projectId} 
        currentAssetId={asset.id}
        onSelect={(url) => {
          setCoverUrl(url);
          setDirty(true);
        }} 
      />
    </div>
  );
}
