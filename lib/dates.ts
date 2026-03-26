import type { DateOption } from "@/lib/types";

const MOSCOW_TIMEZONE = "Europe/Moscow";
const START_DATE_UTC = Date.UTC(2026, 5, 1);
const END_DATE_UTC = Date.UTC(2026, 8, 30);
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_SUFFIXES: Record<DateOption["weekday"], string> = {
  fri: "fri",
  sat: "sat",
  sun: "sun",
};

const WEEKDAY_LABELS: Record<DateOption["weekday"], DateOption["weekdayLabel"]> = {
  fri: "Пт",
  sat: "Сб",
  sun: "Вс",
};

function capitalize(value: string): string {
  return value.slice(0, 1).toLocaleUpperCase("ru-RU") + value.slice(1);
}

function getMonthLabel(date: Date): string {
  return capitalize(
    new Intl.DateTimeFormat("ru-RU", {
      month: "long",
      timeZone: MOSCOW_TIMEZONE,
    }).format(date),
  );
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

export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

export function generateDateOptions(): DateOption[] {
  const dates: DateOption[] = [];

  for (
    let currentDateUtc = START_DATE_UTC;
    currentDateUtc <= END_DATE_UTC;
    currentDateUtc += DAY_IN_MS
  ) {
    const date = new Date(currentDateUtc);
    const dayOfWeek = date.getUTCDay();
    let weekday: DateOption["weekday"] | null = null;

    if (dayOfWeek === 5) {
      weekday = "fri";
    } else if (dayOfWeek === 6) {
      weekday = "sat";
    } else if (dayOfWeek === 0) {
      weekday = "sun";
    }

    if (!weekday) {
      continue;
    }

    dates.push({
      value: formatDateValue(date, weekday),
      label: formatDateLabel(date, weekday),
      isoDate: toIsoDate(date),
      weekday,
      weekdayLabel: WEEKDAY_LABELS[weekday],
      dayNumber: date.getUTCDate(),
      monthIndex: date.getUTCMonth(),
      monthKey: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      monthLabel: getMonthLabel(date),
      year: date.getUTCFullYear(),
      isEvening: weekday === "fri",
    });
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
