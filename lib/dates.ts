import type { DateOption } from "@/lib/types";

const MOSCOW_TIMEZONE = "Europe/Moscow";
const BASE_DATE_UTC = Date.UTC(2026, 5, 1);
const WEEKDAY_SUFFIXES: Record<DateOption["weekday"], string> = {
  fri: "fri",
  sat: "sat",
  sun: "sun",
};

const WEEKDAY_LABELS: Record<DateOption["weekday"], string> = {
  fri: "Пт",
  sat: "Сб",
  sun: "Вс",
};

function addDays(baseUtc: number, days: number): Date {
  return new Date(baseUtc + days * 24 * 60 * 60 * 1000);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatMonthDay(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: MOSCOW_TIMEZONE,
  }).format(date);
}

function formatDateLabel(date: Date, weekday: DateOption["weekday"]): string {
  const dayLabel = WEEKDAY_LABELS[weekday];
  const suffix = weekday === "fri" ? " (вечер)" : "";

  return `${dayLabel}, ${formatMonthDay(date)}${suffix}`;
}

function formatDateValue(date: Date, weekday: DateOption["weekday"]): string {
  return `${toIsoDate(date)}-${WEEKDAY_SUFFIXES[weekday]}`;
}

export function generateDateOptions(): DateOption[] {
  const dates: DateOption[] = [];

  for (let week = 0; week < 8; week += 1) {
    const mondayUtc = BASE_DATE_UTC + week * 7 * 24 * 60 * 60 * 1000;
    const friday = addDays(mondayUtc, 4);
    const saturday = addDays(mondayUtc, 5);
    const sunday = addDays(mondayUtc, 6);

    for (const [date, weekday] of [
      [friday, "fri"],
      [saturday, "sat"],
      [sunday, "sun"],
    ] as const) {
      dates.push({
        value: formatDateValue(date, weekday),
        label: formatDateLabel(date, weekday),
        isoDate: toIsoDate(date),
        weekday,
      });
    }
  }

  return dates;
}

export const DATE_OPTIONS = generateDateOptions();
export const DATE_VALUE_SET = new Set(DATE_OPTIONS.map((option) => option.value));

export function getDateLabelByValue(value: string): string {
  return DATE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function sortSelectedDates(values: string[]): string[] {
  const selectedSet = new Set(values);

  return DATE_OPTIONS.filter((option) => selectedSet.has(option.value)).map(
    (option) => option.value,
  );
}

export function formatDisplayDateTime(isoDateTime: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MOSCOW_TIMEZONE,
  }).format(new Date(isoDateTime));
}
