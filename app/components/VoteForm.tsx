"use client";

import { useEffect, useState } from "react";
import { ZodError } from "zod";
import { parseIsoDate } from "@/lib/dates";
import type { DateOption } from "@/lib/types";
import { votePayloadSchema } from "@/lib/validation";

type VoteFormProps = {
  dateOptions: DateOption[];
  initialFullName?: string;
  initialSelectedDates?: string[];
  onSubmitted: (vote: { fullName: string; selectedDates: string[] }) => void;
};

type MonthGroup = {
  monthKey: string;
  monthLabel: string;
  year: number;
  firstWeekdayOffset: number;
  daysInMonth: number;
  optionsByDay: Map<number, DateOption[]>;
};

const WEEKDAY_HEADERS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function sortSelectedDates(selectedDates: string[], options: DateOption[]) {
  const selectedSet = new Set(selectedDates);

  return options
    .filter((option) => selectedSet.has(option.value))
    .map((option) => option.value);
}

function getMondayFirstWeekday(date: Date) {
  return (date.getUTCDay() + 6) % 7;
}

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function groupDateOptionsByMonth(dateOptions: DateOption[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const option of dateOptions) {
    const existingGroup = groups.get(option.monthKey);

    if (existingGroup) {
      const dayOptions = existingGroup.optionsByDay.get(option.dayNumber) ?? [];
      existingGroup.optionsByDay.set(option.dayNumber, [...dayOptions, option]);
      continue;
    }

    const monthStartDate = parseIsoDate(
      `${option.year}-${String(option.monthIndex + 1).padStart(2, "0")}-01`,
    );

    groups.set(option.monthKey, {
      monthKey: option.monthKey,
      monthLabel: option.monthLabel,
      year: option.year,
      firstWeekdayOffset: getMondayFirstWeekday(monthStartDate),
      daysInMonth: getDaysInMonth(option.year, option.monthIndex),
      optionsByDay: new Map([[option.dayNumber, [option]]]),
    });
  }

  return [...groups.values()];
}

export default function VoteForm({
  dateOptions,
  initialFullName = "",
  initialSelectedDates = [],
  onSubmitted,
}: VoteFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [selectedDates, setSelectedDates] = useState(
    sortSelectedDates(initialSelectedDates, dateOptions),
  );
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFullName(initialFullName);
    setSelectedDates(sortSelectedDates(initialSelectedDates, dateOptions));
    setError(null);
  }, [dateOptions, initialFullName, initialSelectedDates]);

  function handleSlotToggle(value: string) {
    setSelectedDates((current) => {
      const exists = current.includes(value);

      if (exists) {
        return current.filter((item) => item !== value);
      }

      return sortSelectedDates([...current, value], dateOptions);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const payload = votePayloadSchema.parse({
        fullName,
        selectedDates,
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
        selectedDates: payload.selectedDates,
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

  const monthGroups = groupDateOptionsByMonth(dateOptions);
  const selectedDayCount = new Set(
    dateOptions
      .filter((option) => selectedDates.includes(option.value))
      .map((option) => option.dateKey),
  ).size;

  return (
    <div className="rounded-[28px] border border-sky/70 bg-white/80 p-5 shadow-card backdrop-blur sm:p-7">
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-ink">Голосование</h2>
        <p className="text-sm leading-6 text-ink/65">
          Нажми на число в календаре, затем отметь внутри выбранного дня
          подходящее время: день, вечер или оба варианта.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink" htmlFor="fullName">
            Фамилия Имя
          </label>
          <input
            autoComplete="name"
            className="w-full rounded-2xl border border-sky/80 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
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

        <div className="rounded-3xl border border-sky/70 bg-paper/80 px-4 py-4">
          <div className="flex flex-wrap gap-3 text-sm text-ink/70">
            <span className="rounded-full bg-white px-3 py-1">
              Период: <span className="font-semibold text-ink">июнь - сентябрь 2026</span>
            </span>
            <span className="rounded-full bg-white px-3 py-1">
              Доступных дней:{" "}
              <span className="font-semibold text-ink">
                {new Set(dateOptions.map((option) => option.dateKey)).size}
              </span>
            </span>
            <span className="rounded-full bg-white px-3 py-1">
              Выбрано дней: <span className="font-semibold text-ink">{selectedDayCount}</span>
            </span>
            <span className="rounded-full bg-white px-3 py-1">
              Выбрано слотов: <span className="font-semibold text-ink">{selectedDates.length}</span>
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-ink">Календарь дат</p>
            <p className="mt-1 text-xs text-ink/50">
              Активны пятницы, субботы и воскресенья. После клика по дню откроются
              кнопки выбора времени.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {monthGroups.map((monthGroup) => (
              <section
                className="rounded-[28px] border border-sky/70 bg-white/90 p-4"
                key={monthGroup.monthKey}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-ink">
                      {monthGroup.monthLabel}
                    </h3>
                    <p className="text-xs uppercase tracking-[0.18em] text-ink/45">
                      {monthGroup.year}
                    </p>
                  </div>
                  <span className="rounded-full bg-sky/40 px-3 py-1 text-xs font-semibold text-ink/70">
                    {monthGroup.optionsByDay.size} дней для выбора
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">
                  {WEEKDAY_HEADERS.map((weekday) => (
                    <div className="py-1" key={`${monthGroup.monthKey}-${weekday}`}>
                      {weekday}
                    </div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-1.5">
                  {Array.from({ length: monthGroup.firstWeekdayOffset }).map(
                    (_, index) => (
                      <div
                        className="h-[74px] rounded-2xl bg-sky/15"
                        key={`${monthGroup.monthKey}-offset-${index}`}
                      />
                    ),
                  )}

                  {Array.from({ length: monthGroup.daysInMonth }, (_, index) => {
                    const dayNumber = index + 1;
                    const dayOptions = monthGroup.optionsByDay.get(dayNumber);

                    if (!dayOptions) {
                      return (
                        <div
                          className="flex h-[74px] items-start justify-end rounded-2xl border border-transparent bg-sky/10 p-2 text-xs text-ink/30"
                          key={`${monthGroup.monthKey}-day-${dayNumber}`}
                        >
                          {dayNumber}
                        </div>
                      );
                    }

                    const [firstOption] = dayOptions;
                    const selectedForDay = dayOptions.filter((option) =>
                      selectedDates.includes(option.value),
                    );
                    const isExpanded = activeDateKey === firstOption.dateKey;

                    return (
                      <div
                        className={`rounded-2xl border p-2 transition ${
                          selectedForDay.length > 0
                            ? "border-accent bg-accent/10"
                            : "border-sky/80 bg-white hover:border-accent/35 hover:bg-sky/10"
                        }`}
                        key={firstOption.dateKey}
                      >
                        <button
                          className="flex w-full flex-col gap-1 text-left"
                          onClick={() =>
                            setActiveDateKey((current) =>
                              current === firstOption.dateKey
                                ? null
                                : firstOption.dateKey,
                            )
                          }
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent/75">
                              {firstOption.weekdayLabel}
                            </span>
                            {selectedForDay.length > 0 ? (
                              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                {selectedForDay.length}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-lg font-semibold text-ink">
                            {dayNumber}
                          </span>
                          <span className="text-[11px] text-ink/45">
                            {selectedForDay.length > 0
                              ? selectedForDay.map((option) => option.timeLabel).join(", ")
                              : "Нажми для выбора"}
                          </span>
                        </button>

                        {isExpanded || selectedForDay.length > 0 ? (
                          <div className="mt-2 grid grid-cols-2 gap-1.5">
                            {dayOptions.map((option) => {
                              const checked = selectedDates.includes(option.value);

                              return (
                                <button
                                  className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${
                                    checked
                                      ? "bg-accent text-white"
                                      : "bg-sky/20 text-ink/70 hover:bg-sky/35"
                                  }`}
                                  key={option.value}
                                  onClick={() => handleSlotToggle(option.value)}
                                  type="button"
                                >
                                  {option.timeLabel}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
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
            Можно отметить и дневной, и вечерний вариант в один и тот же день.
          </p>
          <button
            className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-accent/50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Сохраняем..." : "Отправить"}
          </button>
        </div>
      </form>
    </div>
  );
}
