"use client";

import {
  X
} from "lucide-react";
import { createPortal } from "react-dom";

export function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-200 flex cursor-pointer items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full border border-border/40 bg-background/80 p-2 text-foreground shadow-xl backdrop-blur-xl transition-colors hover:bg-background"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
