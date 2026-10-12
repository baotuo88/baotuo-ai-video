"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface GenerationDeleteButtonProps {
  recordId: number;
  onDelete: (id: number) => Promise<void>;
}

export function GenerationDeleteButton({ recordId, onDelete }: GenerationDeleteButtonProps) {
  const { confirm } = useConfirm();
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    setPending(true);
    try {
      if (await confirm({
        title: "删除创作记录",
        description: "删除该记录及其结果列表。已加入资产库或分镜的媒体仍会保留。",
        confirmText: "删除",
        variant: "destructive",
      })) {
        await onDelete(recordId);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Button variant="destructive-ghost" size="xs" disabled={pending} onClick={handleDelete} title="删除创作记录">
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
      删除
    </Button>
  );
}
