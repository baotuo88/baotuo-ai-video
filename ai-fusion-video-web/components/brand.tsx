import { Clapperboard } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

export function Brand() {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Clapperboard className="size-5" aria-hidden="true" />
      </span>
      <span className="truncate text-sm font-semibold tracking-tight">{BRAND_NAME}</span>
    </span>
  );
}
