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
  monthIndex: number;
  firstWeekdayOffset: number;
  daysInMonth: number;
  optionsByDay: Map<number, DateOption>;
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
      existingGroup.optionsByDay.set(option.dayNumber, option);
      continue;
    }

    const monthStartDate = parseIsoDate(
      `${option.year}-${String(option.monthIndex + 1).padStart(2, "0")}-01`,
    );

    groups.set(option.monthKey, {
      monthKey: option.monthKey,
      monthLabel: option.monthLabel,
      year: option.year,
      monthIndex: option.monthIndex,
      firstWeekdayOffset: getMondayFirstWeekday(monthStartDate),
      daysInMonth: getDaysInMonth(option.year, option.monthIndex),
      optionsByDay: new Map([[option.dayNumber, option]]),
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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFullName(initialFullName);
    setSelectedDates(sortSelectedDates(initialSelectedDates, dateOptions));
    setError(null);
  }, [dateOptions, initialFullName, initialSelectedDates]);

  function handleDateToggle(value: string, checked: boolean) {
    setSelectedDates((current) => {
      if (checked) {
        return sortSelectedDates([...current, value], dateOptions);
      }

      return current.filter((item) => item !== value);
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

  return (
    <div className="rounded-[28px] border border-sky/70 bg-white/80 p-5 shadow-card backdrop-blur sm:p-7">
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-ink">Голосование</h2>
        <p className="text-sm leading-6 text-ink/65">
          Укажи фамилию и имя, затем выбери подходящие даты в компактном
          календаре с июня по сентябрь 2026.
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
              Вариантов: <span className="font-semibold text-ink">{dateOptions.length}</span>
            </span>
            <span className="rounded-full bg-white px-3 py-1">
              Выбрано: <span className="font-semibold text-ink">{selectedDates.length}</span>
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-ink">Удобные даты</p>
            <p className="mt-1 text-xs text-ink/50">
              Выбирай пятницу, субботу и воскресенье. Пятницы отмечены как
              вечерние.
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
                    {monthGroup.optionsByDay.size} дат для выбора
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
                        className="h-[70px] rounded-2xl bg-sky/15"
                        key={`${monthGroup.monthKey}-offset-${index}`}
                      />
                    ),
                  )}

                  {Array.from({ length: monthGroup.daysInMonth }, (_, index) => {
                    const dayNumber = index + 1;
                    const option = monthGroup.optionsByDay.get(dayNumber);

                    if (!option) {
                      return (
                        <div
                          className="flex h-[70px] items-start justify-end rounded-2xl border border-transparent bg-sky/10 p-2 text-xs text-ink/30"
                          key={`${monthGroup.monthKey}-day-${dayNumber}`}
                        >
                          {dayNumber}
                        </div>
                      );
                    }

                    const checked = selectedDates.includes(option.value);

                    return (
                      <label
                        className={`group flex h-[70px] cursor-pointer flex-col justify-between rounded-2xl border p-2.5 transition ${
                          checked
                            ? "border-accent bg-accent text-white shadow-sm"
                            : "border-sky/80 bg-white hover:border-accent/35 hover:bg-sky/10"
                        }`}
                        key={option.value}
                      >
                        <input
                          checked={checked}
                          className="sr-only"
                          onChange={(event) =>
                            handleDateToggle(option.value, event.target.checked)
                          }
                          type="checkbox"
                        />
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
                              checked ? "text-white/80" : "text-accent/75"
                            }`}
                          >
                            {option.weekdayLabel}
                          </span>
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                              checked
                                ? "bg-white/20 text-white"
                                : "bg-sky/35 text-accent/65"
                            }`}
                          >
                            ✓
                          </span>
                        </div>

                        <div className="flex items-end justify-between gap-2">
                          <span className="text-lg font-semibold">{dayNumber}</span>
                          <span
                            className={`text-[11px] font-medium ${
                              checked ? "text-white/80" : "text-ink/50"
                            }`}
                          >
                            {option.isEvening ? "вечер" : "свободно"}
                          </span>
                        </div>
                      </label>
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
            Можно выбрать несколько выходных и вечерних пятниц.
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
