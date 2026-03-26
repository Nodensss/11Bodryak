"use client";

import type { ToastState } from "@/lib/types";

type ToastProps = {
  toast: ToastState | null;
};

export default function Toast({ toast }: ToastProps) {
  if (!toast) {
    return null;
  }

  const toneClasses =
    toast.tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 max-w-sm">
      <div
        className={`rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${toneClasses}`}
      >
        <p className="text-sm font-semibold">{toast.message}</p>
      </div>
    </div>
  );
}
