"use client";

import { useEffect, useState } from "react";
import { ZodError } from "zod";
import DateCheckbox from "@/app/components/DateCheckbox";
import type { DateOption } from "@/lib/types";
import { votePayloadSchema } from "@/lib/validation";

type VoteFormProps = {
  dateOptions: DateOption[];
  initialFullName?: string;
  initialSelectedDates?: string[];
  onSubmitted: (vote: { fullName: string; selectedDates: string[] }) => void;
};

function sortSelectedDates(selectedDates: string[], options: DateOption[]) {
  const selectedSet = new Set(selectedDates);

  return options
    .filter((option) => selectedSet.has(option.value))
    .map((option) => option.value);
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

  return (
    <div className="rounded-[28px] border border-sky/70 bg-white/80 p-5 shadow-card backdrop-blur sm:p-7">
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-ink">Голосование</h2>
        <p className="text-sm leading-6 text-ink/65">
          Укажи фамилию и имя, затем отметь все даты, которые тебе подходят.
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

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink">Удобные даты</p>
            <p className="mt-1 text-xs text-ink/50">
              Можно выбрать несколько вариантов.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dateOptions.map((option) => (
              <DateCheckbox
                checked={selectedDates.includes(option.value)}
                key={option.value}
                onChange={handleDateToggle}
                option={option}
              />
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
            Выбрано дат: <span className="font-semibold">{selectedDates.length}</span>
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
