import type { DateOption, VoteDay, VoteSelection, VoteSlot } from "@/lib/types";

const MOSCOW_TIMEZONE = "Europe/Moscow";
const START_DATE_UTC = Date.UTC(2026, 5, 1);
const END_DATE_UTC = Date.UTC(2026, 8, 30);
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const STORAGE_SEPARATOR = "|";
const SLOT_ORDER: VoteSlot[] = ["evening", "12-15", "15-18", "18-21"];
const WEEKDAY_LABELS: Record<VoteDay, DateOption["weekdayLabel"]> = {
  fri: "Пт",
  sat: "Сб",
  sun: "Вс",
};

export const SLOT_BUTTON_LABELS: Record<VoteSlot, string> = {
  evening: "Вечер",
  "12-15": "12:00-15:00",
  "15-18": "15:00-18:00",
  "18-21": "18:00-21:00",
};

export const SLOT_COMPACT_LABELS: Record<VoteSlot, string> = {
  evening: "Вечер",
  "12-15": "12-15",
  "15-18": "15-18",
  "18-21": "18-21",
};

type MonthGroup = {
  monthKey: string;
  monthLabel: string;
  options: DateOption[];
  year: number;
};

function capitalize(value: string): string {
  return value.slice(0, 1).toLocaleUpperCase("ru-RU") + value.slice(1);
}

function isVoteSlot(value: string): value is VoteSlot {
  return SLOT_ORDER.includes(value as VoteSlot);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonthLabel(date: Date): string {
  return capitalize(
    new Intl.DateTimeFormat("ru-RU", {
      month: "long",
      timeZone: MOSCOW_TIMEZONE,
    }).format(date),
  );
}

function formatMonthDay(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: MOSCOW_TIMEZONE,
  }).format(date);
}

function getAvailableSlots(weekday: VoteDay): VoteSlot[] {
  if (weekday === "fri") {
    return ["evening"];
  }

  return ["12-15", "15-18", "18-21"];
}

function formatDateLabel(date: Date, weekday: VoteDay): string {
  const baseLabel = `${WEEKDAY_LABELS[weekday]}, ${formatMonthDay(date)}`;

  if (weekday === "fri") {
    return `${baseLabel} (вечер)`;
  }

  return baseLabel;
}

function normalizeStoredSlots(option: DateOption, slotToken: string): VoteSlot[] {
  if (slotToken === "day") {
    return option.weekday === "fri" ? ["evening"] : ["12-15", "15-18"];
  }

  if (slotToken === "evening") {
    return option.weekday === "fri" ? ["evening"] : ["18-21"];
  }

  if (isVoteSlot(slotToken) && option.slots.includes(slotToken)) {
    return [slotToken];
  }

  return [];
}

function sortSlots(slots: VoteSlot[]): VoteSlot[] {
  const uniqueSlots = [...new Set(slots)];

  return uniqueSlots.sort(
    (left, right) => SLOT_ORDER.indexOf(left) - SLOT_ORDER.indexOf(right),
  );
}

function parseLegacyStoredValue(value: string): { date: string; slotToken: string } | null {
  const match = /^(\d{4}-\d{2}-\d{2})-(day|evening)$/.exec(value);

  if (!match) {
    return null;
  }

  return {
    date: match[1],
    slotToken: match[2],
  };
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
    let weekday: VoteDay | null = null;

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

    const isoDate = toIsoDate(date);

    dates.push({
      dateKey: isoDate,
      isoDate,
      label: formatDateLabel(date, weekday),
      weekday,
      weekdayLabel: WEEKDAY_LABELS[weekday],
      dayNumber: date.getUTCDate(),
      monthIndex: date.getUTCMonth(),
      monthKey: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      monthLabel: getMonthLabel(date),
      slots: getAvailableSlots(weekday),
      year: date.getUTCFullYear(),
    });
  }

  return dates;
}

export const DATE_OPTIONS = generateDateOptions();
export const DATE_KEY_SET = new Set(DATE_OPTIONS.map((option) => option.dateKey));
export const DATE_OPTION_MAP = new Map(
  DATE_OPTIONS.map((option) => [option.dateKey, option] as const),
);

export function getDateOption(dateKey: string): DateOption | undefined {
  return DATE_OPTION_MAP.get(dateKey);
}

export function sortSelections(selections: VoteSelection[]): VoteSelection[] {
  const normalized = new Map<string, VoteSelection>();

  for (const selection of selections) {
    const option = DATE_OPTION_MAP.get(selection.date);

    if (!option) {
      continue;
    }

    const slots = sortSlots(
      selection.slots.filter((slot) => option.slots.includes(slot)),
    );

    if (slots.length === 0) {
      continue;
    }

    normalized.set(selection.date, {
      date: option.dateKey,
      day: option.weekday,
      slots,
    });
  }

  return DATE_OPTIONS.filter((option) => normalized.has(option.dateKey)).map(
    (option) => normalized.get(option.dateKey) as VoteSelection,
  );
}

export function serializeSelectionsForStorage(selections: VoteSelection[]): string[] {
  return sortSelections(selections).flatMap((selection) =>
    selection.slots.map(
      (slot) =>
        `${selection.date}${STORAGE_SEPARATOR}${selection.day}${STORAGE_SEPARATOR}${slot}`,
    ),
  );
}

export function deserializeSelectionsFromStorage(values: string[]): VoteSelection[] {
  const groupedSelections = new Map<
    string,
    {
      date: string;
      day: VoteDay;
      slots: Set<VoteSlot>;
    }
  >();

  for (const value of values) {
    let date: string | null = null;
    let slotToken: string | null = null;

    if (value.includes(STORAGE_SEPARATOR)) {
      const parts = value.split(STORAGE_SEPARATOR);

      if (parts.length === 3) {
        [date, , slotToken] = parts;
      }
    } else {
      const legacyValue = parseLegacyStoredValue(value);

      if (legacyValue) {
        date = legacyValue.date;
        slotToken = legacyValue.slotToken;
      }
    }

    if (!date || !slotToken) {
      continue;
    }

    const option = DATE_OPTION_MAP.get(date);

    if (!option) {
      continue;
    }

    const normalizedSlots = normalizeStoredSlots(option, slotToken);

    if (normalizedSlots.length === 0) {
      continue;
    }

    const existingSelection = groupedSelections.get(option.dateKey) ?? {
      date: option.dateKey,
      day: option.weekday,
      slots: new Set<VoteSlot>(),
    };

    for (const slot of normalizedSlots) {
      existingSelection.slots.add(slot);
    }

    groupedSelections.set(option.dateKey, existingSelection);
  }

  return sortSelections(
    [...groupedSelections.values()].map((selection) => ({
      date: selection.date,
      day: selection.day,
      slots: [...selection.slots],
    })),
  );
}

export function getWeekendGroupKey(option: DateOption): string {
  const date = parseIsoDate(option.isoDate);

  if (option.weekday === "sat") {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  if (option.weekday === "sun") {
    date.setUTCDate(date.getUTCDate() - 2);
  }

  return toIsoDate(date);
}

export function groupDateOptionsByMonth(dateOptions: DateOption[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const option of dateOptions) {
    const existingGroup = groups.get(option.monthKey);

    if (existingGroup) {
      existingGroup.options.push(option);
      continue;
    }

    groups.set(option.monthKey, {
      monthKey: option.monthKey,
      monthLabel: option.monthLabel,
      options: [option],
      year: option.year,
    });
  }

  return [...groups.values()];
}

export function getSlotButtonLabel(slot: VoteSlot): string {
  return SLOT_BUTTON_LABELS[slot];
}

export function getSlotCompactLabel(slot: VoteSlot): string {
  return SLOT_COMPACT_LABELS[slot];
}

export function formatCompactSlotList(slots: VoteSlot[]): string {
  return sortSlots(slots)
    .map((slot) => getSlotCompactLabel(slot))
    .join(", ");
}

export type CalendarDay = {
  dayNumber: number;
  isoDate: string;
  isWeekend: boolean;
  weekday: VoteDay | null;
  dateOption: DateOption | null;
  isCurrentMonth: boolean;
};

export type CalendarMonth = {
  monthKey: string;
  monthLabel: string;
  year: number;
  weeks: CalendarDay[][];
};

export function generateCalendarMonths(dateOptions: DateOption[]): CalendarMonth[] {
  const optionMap = new Map(dateOptions.map((o) => [o.dateKey, o]));
  const months: CalendarMonth[] = [];

  for (let monthIdx = 5; monthIdx <= 8; monthIdx++) {
    const firstDay = new Date(Date.UTC(2026, monthIdx, 1));
    const year = 2026;
    const monthLabel = capitalize(
      new Intl.DateTimeFormat("ru-RU", {
        month: "long",
        timeZone: MOSCOW_TIMEZONE,
      }).format(firstDay),
    );
    const monthKey = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;

    const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();

    // Build all days
    const allDays: CalendarDay[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, monthIdx, d));
      const dow = date.getUTCDay(); // 0=Sun
      const iso = toIsoDate(date);
      let voteDay: VoteDay | null = null;
      if (dow === 5) voteDay = "fri";
      else if (dow === 6) voteDay = "sat";
      else if (dow === 0) voteDay = "sun";

      allDays.push({
        dayNumber: d,
        isoDate: iso,
        isWeekend: dow === 5 || dow === 6 || dow === 0,
        weekday: voteDay,
        dateOption: optionMap.get(iso) ?? null,
        isCurrentMonth: true,
      });
    }

    // Group into weeks (Mon-Sun rows)
    const weeks: CalendarDay[][] = [];
    let currentWeek: CalendarDay[] = [];

    // Pad beginning: Monday = 0, Tuesday = 1, ... Sunday = 6
    const firstDow = firstDay.getUTCDay();
    const mondayOffset = firstDow === 0 ? 6 : firstDow - 1;
    for (let p = 0; p < mondayOffset; p++) {
      currentWeek.push({
        dayNumber: 0,
        isoDate: "",
        isWeekend: false,
        weekday: null,
        dateOption: null,
        isCurrentMonth: false,
      });
    }

    for (const day of allDays) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Pad end
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({
          dayNumber: 0,
          isoDate: "",
          isWeekend: false,
          weekday: null,
          dateOption: null,
          isCurrentMonth: false,
        });
      }
      weeks.push(currentWeek);
    }

    months.push({ monthKey, monthLabel, year, weeks });
  }

  return months;
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
