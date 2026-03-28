"use client";

import { useEffect, useState } from "react";
import { ZodError } from "zod";
import {
  formatCompactSlotList,
  generateCalendarMonths,
  getSlotButtonLabel,
  sortSelections,
} from "@/lib/dates";
import type { CalendarDay } from "@/lib/dates";
import type { DateOption, VoteSelection, VoteSlot } from "@/lib/types";
import { votePayloadSchema } from "@/lib/validation";

type VoteFormProps = {
  dateOptions: DateOption[];
  initialFullName?: string;
  initialSelections?: VoteSelection[];
  onSubmitted: (vote: { fullName: string; selections: VoteSelection[] }) => void;
};

function buildSelectionMap(selections: VoteSelection[]) {
  return new Map(selections.map((selection) => [selection.date, selection]));
}

const WEEKDAY_HEADERS = [
  { label: "Пн", isWeekend: false },
  { label: "Вт", isWeekend: false },
  { label: "Ср", isWeekend: false },
  { label: "Чт", isWeekend: false },
  { label: "Пт", isWeekend: true },
  { label: "Сб", isWeekend: true },
  { label: "Вс", isWeekend: true },
];

export default function VoteForm({
  dateOptions,
  initialFullName = "",
  initialSelections = [],
  onSubmitted,
}: VoteFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [selections, setSelections] = useState(sortSelections(initialSelections));
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFullName(initialFullName);
    setSelections(sortSelections(initialSelections));
    setError(null);
  }, [initialFullName, initialSelections]);

  function handleDayClick(day: CalendarDay) {
    if (!day.dateOption) return;

    const option = day.dateOption;

    if (option.weekday === "fri") {
      // Toggle friday
      setSelections((current) => {
        const map = buildSelectionMap(current);
        if (map.has(option.dateKey)) {
          map.delete(option.dateKey);
        } else {
          map.set(option.dateKey, {
            date: option.dateKey,
            day: option.weekday,
            slots: ["evening"],
          });
        }
        return sortSelections([...map.values()]);
      });
    } else {
      // Expand/collapse slot picker for sat/sun
      setExpandedDate((current) =>
        current === option.dateKey ? null : option.dateKey,
      );
    }
  }

  function handleSlotToggle(option: DateOption, slot: VoteSlot) {
    setSelections((current) => {
      const map = buildSelectionMap(current);
      const sel = map.get(option.dateKey);
      const slotSet = new Set(sel?.slots ?? []);

      if (slotSet.has(slot)) {
        slotSet.delete(slot);
      } else {
        slotSet.add(slot);
      }

      if (slotSet.size === 0) {
        map.delete(option.dateKey);
      } else {
        map.set(option.dateKey, {
          date: option.dateKey,
          day: option.weekday,
          slots: [...slotSet],
        });
      }

      return sortSelections([...map.values()]);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const payload = votePayloadSchema.parse({ fullName, selections });
      setIsSubmitting(true);

      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось сохранить голос.");
      }

      onSubmitted({
        fullName: payload.fullName,
        selections: payload.selections,
      });
    } catch (submitError) {
      if (submitError instanceof ZodError) {
        setError(submitError.issues[0]?.message ?? "Проверь введённые данные.");
      } else if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Не удалось сохранить голос.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const calendarMonths = generateCalendarMonths(dateOptions);
  const selectionMap = buildSelectionMap(selections);
  const selectedDayCount = selections.length;
  const selectedSlotCount = selections.reduce(
    (total, s) => total + s.slots.length,
    0,
  );

  function renderCalendarDay(day: CalendarDay) {
    if (!day.isCurrentMonth) {
      return <div key={day.isoDate || Math.random()} />;
    }

    if (!day.isWeekend) {
      // Mon-Thu: small, just number
      return (
        <div
          className="flex items-center justify-center py-1 text-[11px] text-ink/20"
          key={day.isoDate}
        >
          {day.dayNumber}
        </div>
      );
    }

    // Fri, Sat, Sun — interactive
    const option = day.dateOption;
    if (!option) {
      return (
        <div
          className="flex items-center justify-center py-1 text-[11px] text-ink/20"
          key={day.isoDate}
        >
          {day.dayNumber}
        </div>
      );
    }

    const selection = selectionMap.get(option.dateKey);
    const isSelected = Boolean(selection);
    const isExpanded = expandedDate === option.dateKey;

    return (
      <div key={day.isoDate} className="relative">
        <button
          className={`flex w-full flex-col items-center justify-center rounded-xl py-1.5 text-xs font-semibold transition ${
            isSelected
              ? "bg-accent text-white shadow-sm"
              : "bg-sky/20 text-ink/70 hover:bg-sky/40"
          }`}
          onClick={() => handleDayClick(day)}
          type="button"
        >
          <span className="text-base font-bold">{day.dayNumber}</span>
          {isSelected && selection && option.weekday !== "fri" && (
            <span className="mt-0.5 text-[9px] opacity-80">
              {formatCompactSlotList(selection.slots)}
            </span>
          )}
          {isSelected && option.weekday === "fri" && (
            <span className="mt-0.5 text-[9px] opacity-80">Вечер</span>
          )}
        </button>

      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-sky/50 bg-gradient-to-br from-white/90 via-white/80 to-sky/20 p-5 shadow-card backdrop-blur sm:p-7">
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-ink">Голосование</h2>
        <p className="text-sm leading-6 text-ink/55">
          Выбери удобные даты в календаре. Пятницы — вечер. Для субботы и
          воскресенья нажми на число, чтобы выбрать временные слоты.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink" htmlFor="fullName">
            Фамилия Имя
          </label>
          <input
            autoComplete="name"
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            id="fullName"
            maxLength={100}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Например, Петров Алексей"
            value={fullName}
          />
          <p className="text-xs text-ink/50">
            Только кириллица, пробелы и дефисы. Минимум два слова.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/5 bg-sky/15 px-4 py-3">
          <div className="flex flex-wrap gap-2 text-sm text-ink/60">
            <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              Период:{" "}
              <span className="font-semibold text-ink">июнь — сентябрь 2026</span>
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              Дат:{" "}
              <span className="font-semibold text-accent">{selectedDayCount}</span>
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              Слотов:{" "}
              <span className="font-semibold text-accent">{selectedSlotCount}</span>
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink/50">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-accent" />
            <span>Выбрано</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-sky/30" />
            <span>Пт/Сб/Вс — доступно</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-ink/20">1</span>
            <span>Пн-Чт — для ориентира</span>
          </div>
        </div>

        <div className="space-y-5">
          {calendarMonths.map((month) => (
            <section
              className="overflow-hidden rounded-[20px] border border-ink/5 bg-white/80 shadow-sm"
              key={month.monthKey}
            >
              <div className="bg-gradient-to-r from-accent/5 to-sky/10 px-4 py-3">
                <h3 className="text-lg font-semibold text-ink">
                  {month.monthLabel}{" "}
                  <span className="text-sm font-normal text-ink/40">
                    {month.year}
                  </span>
                </h3>
              </div>

              <div className="px-3 pb-3 pt-2">
                {/* Calendar header */}
                <div
                  className="mb-1 grid gap-1"
                  style={{
                    gridTemplateColumns: "1fr 1fr 1fr 1fr 2fr 2fr 2fr",
                  }}
                >
                  {WEEKDAY_HEADERS.map((h) => (
                    <div
                      className={`py-1 text-center text-[10px] font-bold uppercase tracking-wider ${
                        h.isWeekend ? "text-accent/60" : "text-ink/20"
                      }`}
                      key={h.label}
                    >
                      {h.label}
                    </div>
                  ))}
                </div>

                {/* Calendar weeks */}
                <div className="space-y-1">
                  {month.weeks.map((week, wi) => {
                    // Find if any day in this week has expanded slots
                    const expandedDay = week.find(
                      (d) =>
                        d.dateOption &&
                        d.dateOption.weekday !== "fri" &&
                        expandedDate === d.dateOption.dateKey,
                    );
                    const expandedOption = expandedDay?.dateOption ?? null;
                    const expandedSelection = expandedOption
                      ? selectionMap.get(expandedOption.dateKey)
                      : null;

                    return (
                      <div key={`${month.monthKey}-w${wi}`}>
                        <div
                          className="grid gap-1"
                          style={{
                            gridTemplateColumns:
                              "1fr 1fr 1fr 1fr 2fr 2fr 2fr",
                          }}
                        >
                          {week.map((day, di) => (
                            <div
                              key={day.isoDate || `empty-${wi}-${di}`}
                            >
                              {renderCalendarDay(day)}
                            </div>
                          ))}
                        </div>

                        {/* Inline slot picker */}
                        {expandedOption && (
                          <div className="mt-1 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2">
                            <p className="mb-1.5 text-xs font-semibold text-ink/60">
                              {expandedOption.weekday === "sat"
                                ? "Суббота"
                                : "Воскресенье"}
                              , {expandedDay!.dayNumber} — выбери время:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {expandedOption.slots.map((slot) => {
                                const checked =
                                  expandedSelection?.slots.includes(
                                    slot,
                                  ) ?? false;
                                return (
                                  <button
                                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                                      checked
                                        ? "bg-accent text-white shadow-sm"
                                        : "bg-white text-ink/60 hover:bg-sky/30"
                                    }`}
                                    key={slot}
                                    onClick={() =>
                                      handleSlotToggle(
                                        expandedOption,
                                        slot,
                                      )
                                    }
                                    type="button"
                                  >
                                    {getSlotButtonLabel(slot)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink/55">
            Пятница = вечер. Суббота/воскресенье — нажми для выбора слотов.
          </p>
          <button
            className="inline-flex items-center justify-center rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ink hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Сохраняем..." : "Отправить голос"}
          </button>
        </div>
      </form>
    </div>
  );
}
