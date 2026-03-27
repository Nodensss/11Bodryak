"use client";

import { useEffect, useState } from "react";
import { ZodError } from "zod";
import {
  formatCompactSlotList,
  getSlotButtonLabel,
  getWeekendGroupKey,
  groupDateOptionsByMonth,
  sortSelections,
} from "@/lib/dates";
import type { DateOption, VoteDay, VoteSelection, VoteSlot } from "@/lib/types";
import { votePayloadSchema } from "@/lib/validation";

type VoteFormProps = {
  dateOptions: DateOption[];
  initialFullName?: string;
  initialSelections?: VoteSelection[];
  onSubmitted: (vote: { fullName: string; selections: VoteSelection[] }) => void;
};

type WeekGroup = {
  days: Partial<Record<VoteDay, DateOption>>;
  weekKey: string;
};

type MonthGroup = {
  monthKey: string;
  monthLabel: string;
  weeks: WeekGroup[];
  year: number;
};

const WEEKDAY_ORDER: VoteDay[] = ["fri", "sat", "sun"];

function getExpandedDatesFromSelections(selections: VoteSelection[]): string[] {
  return selections
    .filter((selection) => selection.day !== "fri")
    .map((selection) => selection.date);
}

function buildSelectionMap(selections: VoteSelection[]) {
  return new Map(selections.map((selection) => [selection.date, selection]));
}

function groupDateOptionsByMonthAndWeek(dateOptions: DateOption[]): MonthGroup[] {
  return groupDateOptionsByMonth(dateOptions).map((month) => {
    const weeks = new Map<string, WeekGroup>();

    for (const option of month.options) {
      const weekKey = getWeekendGroupKey(option);
      const existingWeek = weeks.get(weekKey) ?? {
        weekKey,
        days: {},
      };

      existingWeek.days[option.weekday] = option;
      weeks.set(weekKey, existingWeek);
    }

    return {
      monthKey: month.monthKey,
      monthLabel: month.monthLabel,
      weeks: [...weeks.values()],
      year: month.year,
    };
  });
}

export default function VoteForm({
  dateOptions,
  initialFullName = "",
  initialSelections = [],
  onSubmitted,
}: VoteFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [selections, setSelections] = useState(sortSelections(initialSelections));
  const [expandedDates, setExpandedDates] = useState<string[]>(
    getExpandedDatesFromSelections(initialSelections),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const normalizedSelections = sortSelections(initialSelections);

    setFullName(initialFullName);
    setSelections(normalizedSelections);
    setExpandedDates(getExpandedDatesFromSelections(normalizedSelections));
    setError(null);
  }, [initialFullName, initialSelections]);

  function handleFridayToggle(option: DateOption) {
    setSelections((current) => {
      const currentMap = buildSelectionMap(current);

      if (currentMap.has(option.dateKey)) {
        currentMap.delete(option.dateKey);
      } else {
        currentMap.set(option.dateKey, {
          date: option.dateKey,
          day: option.weekday,
          slots: ["evening"],
        });
      }

      return sortSelections([...currentMap.values()]);
    });
  }

  function handleExpandToggle(dateKey: string) {
    setExpandedDates((current) =>
      current.includes(dateKey)
        ? current.filter((item) => item !== dateKey)
        : [...current, dateKey],
    );
  }

  function handleSlotToggle(option: DateOption, slot: VoteSlot) {
    setExpandedDates((current) =>
      current.includes(option.dateKey) ? current : [...current, option.dateKey],
    );

    setSelections((current) => {
      const currentMap = buildSelectionMap(current);
      const currentSelection = currentMap.get(option.dateKey);
      const slotSet = new Set(currentSelection?.slots ?? []);

      if (slotSet.has(slot)) {
        slotSet.delete(slot);
      } else {
        slotSet.add(slot);
      }

      if (slotSet.size === 0) {
        currentMap.delete(option.dateKey);
      } else {
        currentMap.set(option.dateKey, {
          date: option.dateKey,
          day: option.weekday,
          slots: [...slotSet],
        });
      }

      return sortSelections([...currentMap.values()]);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const payload = votePayloadSchema.parse({
        fullName,
        selections,
      });

      setIsSubmitting(true);

      const response = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        error?: string;
      };

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

  const monthGroups = groupDateOptionsByMonthAndWeek(dateOptions);
  const selectionMap = buildSelectionMap(selections);
  const selectedDayCount = selections.length;
  const selectedSlotCount = selections.reduce(
    (total, selection) => total + selection.slots.length,
    0,
  );

  return (
    <div className="rounded-[28px] border border-sky/50 bg-gradient-to-br from-white/90 via-white/80 to-sky/20 p-5 shadow-card backdrop-blur sm:p-7">
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-ink">Голосование</h2>
        <p className="text-sm leading-6 text-ink/55">
          Пятницы отмечаются целиком как вечер, а для субботы и воскресенья можно
          выбрать один или несколько временных слотов.
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

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-ink">Доступные даты</p>
            <p className="mt-1 text-xs text-ink/50">
              Каждая неделя состоит из пятницы, субботы и воскресенья. Для
              субботы и воскресенья раскрывай карточку и выбирай подходящие
              интервалы времени.
            </p>
          </div>

          <div className="space-y-5">
            {monthGroups.map((monthGroup) => (
              <section
                className="rounded-[24px] border border-ink/5 bg-white/80 p-4 shadow-sm sm:p-5"
                key={monthGroup.monthKey}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">
                      {monthGroup.monthLabel}
                    </h3>
                    <p className="text-xs text-ink/40">
                      {monthGroup.year}
                    </p>
                  </div>
                  <span className="rounded-full bg-sky/25 px-3 py-1 text-xs font-semibold text-ink/50">
                    {monthGroup.weeks.length} уикендов
                  </span>
                </div>

                <div className="space-y-3">
                  {monthGroup.weeks.map((week) => (
                    <div
                      className="grid gap-3 lg:grid-cols-3"
                      key={`${monthGroup.monthKey}-${week.weekKey}`}
                    >
                      {WEEKDAY_ORDER.map((weekday) => {
                        const option = week.days[weekday];

                        if (!option) {
                          return null;
                        }

                        const selection = selectionMap.get(option.dateKey);
                        const isSelected = Boolean(selection);
                        const isExpanded =
                          selection?.slots.length ||
                          expandedDates.includes(option.dateKey);

                        if (option.weekday === "fri") {
                          return (
                            <button
                              className={`flex min-h-[112px] flex-col items-start justify-between rounded-[24px] border px-4 py-4 text-left transition ${
                                isSelected
                                  ? "border-accent bg-accent text-white shadow-sm"
                                  : "border-sky/80 bg-white text-ink hover:border-accent/35 hover:bg-sky/10"
                              }`}
                              key={option.dateKey}
                              onClick={() => handleFridayToggle(option)}
                              type="button"
                            >
                              <div className="space-y-2">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                                    isSelected
                                      ? "bg-white/20 text-white"
                                      : "bg-sky/35 text-accent"
                                  }`}
                                >
                                  Пятница
                                </span>
                                <div className="text-lg font-semibold">
                                  {option.label}
                                </div>
                              </div>
                              <span
                                className={`text-sm ${
                                  isSelected ? "text-white/85" : "text-ink/55"
                                }`}
                              >
                                {isSelected ? "Выбрано" : "Нажми, чтобы выбрать"}
                              </span>
                            </button>
                          );
                        }

                        return (
                          <div
                            className={`rounded-[24px] border px-4 py-4 transition ${
                              isSelected
                                ? "border-accent bg-accent/10"
                                : "border-sky/80 bg-white"
                            }`}
                            key={option.dateKey}
                          >
                            <button
                              className="flex w-full flex-col items-start gap-2 text-left"
                              onClick={() => handleExpandToggle(option.dateKey)}
                              type="button"
                            >
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                                  isSelected
                                    ? "bg-accent text-white"
                                    : "bg-sky/35 text-accent"
                                }`}
                              >
                                {option.weekday === "sat" ? "Суббота" : "Воскресенье"}
                              </span>
                              <div className="text-lg font-semibold text-ink">
                                {option.label}
                              </div>
                              <span className="text-sm text-ink/55">
                                {selection
                                  ? formatCompactSlotList(selection.slots)
                                  : "Нажми, чтобы открыть слоты"}
                              </span>
                            </button>

                            {isExpanded ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {option.slots.map((slot) => {
                                  const checked =
                                    selection?.slots.includes(slot) ?? false;

                                  return (
                                    <button
                                      className={`rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                                        checked
                                          ? "bg-accent text-white"
                                          : "bg-sky/25 text-ink/75 hover:bg-sky/40"
                                      }`}
                                      key={`${option.dateKey}-${slot}`}
                                      onClick={() => handleSlotToggle(option, slot)}
                                      type="button"
                                    >
                                      {getSlotButtonLabel(slot)}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink/55">
            Пятница сохраняется как вечер, а суббота и воскресенье считаются
            выбранными, если отмечен хотя бы один слот.
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
