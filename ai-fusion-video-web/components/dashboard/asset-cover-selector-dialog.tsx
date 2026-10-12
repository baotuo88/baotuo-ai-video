"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SafeImage } from "@/components/ui/safe-image";
import { getApiErrorMessage } from "@/lib/api/api-error";
import {
  assetApi,
  type AssetWithItems
} from "@/lib/api/asset";
import { resolveMediaUrl } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  Images,
  Loader2
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { typeColorMap, typeLabelMap } from "./asset-detail-data";

export function CoverSelectorDialog({ 
  open, 
  onOpenChange, 
  projectId, 
  onSelect 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  projectId: number; 
  currentAssetId: number;
  onSelect: (url: string) => void; 
}) {
  const [assets, setAssets] = useState<AssetWithItems[]>([]);
  const [loadedProjectId, setLoadedProjectId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const loading = open && projectId > 0 && loadedProjectId !== projectId;

  useEffect(() => {
    if (open && projectId) {
      assetApi.listWithItems(projectId)
        .then(res => {
          setAssets(res);
          setLoadedProjectId(projectId);
          // 默认展开所有资产
          const allIds = new Set(res.map(a => a.id));
          setExpandedIds(allIds);
        })
        .catch(err => {
          console.error(err);
          toast.error(getApiErrorMessage(err));
          setAssets([]);
          setLoadedProjectId(projectId);
        });
    }
  }, [open, projectId]);

  const handleExpandToggle = (assetId: number) => {
    setExpandedIds(prev => {
       const next = new Set(prev);
       if (next.has(assetId)) {
         next.delete(assetId);
       } else {
         next.add(assetId);
       }
       return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[80vh] flex flex-col overflow-hidden bg-card/95 backdrop-blur-md rounded-2xl p-0 gap-0">
        <DialogHeader className="px-6 py-5 border-b border-border/30 shrink-0">
          <DialogTitle className="text-base font-semibold">从资产库选择封面</DialogTitle>
          <DialogDescription className="text-xs">点击展开项目中的资产，点击图片以选取该图片为当前主资产封面</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-2.5">
          {loading ? (
             <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" /></div>
          ) : assets.length === 0 ? (
             <div className="py-12 flex flex-col items-center justify-center text-muted-foreground/30">
               <Images className="h-8 w-8 mb-2" />
               <p className="text-xs">项目中暂无资产</p>
             </div>
          ) : (
            assets.map(a => {
              const isExpanded = expandedIds.has(a.id);
              return (
              <div key={a.id} className="border border-border/30 rounded-xl overflow-hidden bg-card/40 transition-all hover:bg-card/60">
                <div 
                  className="px-4 py-3 flex items-center justify-between cursor-pointer"
                  onClick={() => handleExpandToggle(a.id)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={cn("inline-block px-1.5 py-0.5 rounded text-[10px] leading-none font-medium", typeColorMap[a.type] || "bg-muted text-muted-foreground")}>
                      {typeLabelMap[a.type] || a.type}
                    </span>
                    <span className="text-[13px] font-medium">{a.name}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground/60 font-medium">{isExpanded ? '收起' : '展开'}</div>
                </div>
                
                {isExpanded && (
                  <div className="p-4 border-t border-border/30 bg-black/10">
                    {!a.items?.length ? (
                      <div className="py-6 text-center text-xs text-muted-foreground/40">该资产暂无子资产</div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                        {a.items.map(item => {
                           const urlStr = item.thumbnailUrl || item.imageUrl;
                           return (
                             <div 
                               key={item.id} 
                               className={cn(
                                 "group relative aspect-square rounded-lg overflow-hidden border border-border/30 transition-all",
                                 urlStr 
                                   ? "cursor-pointer hover:border-primary/50 hover:ring-2 hover:ring-primary/20 hover:shadow-lg" 
                                   : "opacity-60 cursor-not-allowed bg-muted/20"
                               )}
                               onClick={() => {
                                 if(urlStr) {
                                   onSelect(urlStr);
                                   onOpenChange(false);
                                 }
                               }}
                             >
                               {urlStr ? (
                                 <SafeImage
                                   src={resolveMediaUrl(urlStr) || undefined}
                                   alt={item.name || ""}
                                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                   fallbackType={
                                     a.type === "character"
                                       ? "avatar"
                                       : a.type === "scene"
                                       ? "scene"
                                       : a.type === "prop"
                                       ? "prop"
                                       : "image"
                                   }
                                 />
                               ) : (
                                 <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-muted-foreground/60 p-2">
                                   <Images className="h-5 w-5 mb-1.5 opacity-20" />
                                   <span className="text-[10px] break-all line-clamp-2 leading-tight">{item.name || "无名资产"}</span>
                                 </div>
                               )}
                               {urlStr && (
                                 <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-white/90 truncate opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                                   {item.name || "未命名"}
                                 </div>
                               )}
                             </div>
                           );
                         })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )})
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
