"use client";

import type { DateOption } from "@/lib/types";

type DateCheckboxProps = {
  checked: boolean;
  onChange: (value: string, checked: boolean) => void;
  option: DateOption;
};

export default function DateCheckbox({
  checked,
  onChange,
  option,
}: DateCheckboxProps) {
  return (
    <label
      className={`group flex cursor-pointer items-center gap-4 rounded-2xl border px-4 py-4 transition ${
        checked
          ? "border-accent bg-accent/10 shadow-sm"
          : "border-sky/80 bg-white/80 hover:border-accent/35 hover:bg-white"
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-md border text-sm font-bold transition ${
          checked
            ? "border-accent bg-accent text-white"
            : "border-accent/20 bg-white text-transparent group-hover:text-accent/40"
        }`}
      >
        ✓
      </span>
      <span className="flex flex-col">
        <span className="text-base font-semibold text-ink">{option.label}</span>
        <span className="text-sm text-ink/55">{option.isoDate}</span>
      </span>
      <input
        checked={checked}
        className="sr-only"
        onChange={(event) => onChange(option.value, event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}
