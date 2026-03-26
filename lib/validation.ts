import { z } from "zod";
import { DATE_OPTION_MAP, DATE_OPTIONS } from "@/lib/dates";

const CYRILLIC_FULL_NAME_REGEX = /^[А-ЯЁа-яё-]+(?: [А-ЯЁа-яё-]+)+$/;
const voteDaySchema = z.enum(["fri", "sat", "sun"]);
const voteSlotSchema = z.enum(["evening", "12-15", "15-18", "18-21"]);

export function sanitizeText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[<>]/g, "").trim();
}

export function normalizeFullName(value: string): string {
  return sanitizeText(value).toLocaleLowerCase("ru-RU");
}

export const fullNameSchema = z
  .string()
  .transform(sanitizeText)
  .refine((value) => CYRILLIC_FULL_NAME_REGEX.test(value), {
    message: "Укажи фамилию и имя кириллицей. Допустимы пробелы и дефисы.",
  })
  .refine((value) => value.split(" ").length >= 2, {
    message: "Нужно минимум два слова: фамилия и имя.",
  })
  .refine((value) => value.length <= 100, {
    message: "Имя слишком длинное.",
  });

const voteSelectionSchema = z.object({
  date: z.string(),
  day: voteDaySchema,
  slots: z.array(voteSlotSchema).min(1, "Выбери минимум один слот для даты."),
});

export const votePayloadSchema = z
  .object({
    fullName: fullNameSchema,
    selections: z
      .array(voteSelectionSchema)
      .min(1, "Выбери минимум одну дату.")
      .max(DATE_OPTIONS.length, "Слишком много дат."),
  })
  .superRefine((payload, ctx) => {
    const seenDates = new Set<string>();
    let totalSelectedSlots = 0;

    for (const [index, selection] of payload.selections.entries()) {
      const option = DATE_OPTION_MAP.get(selection.date);

      if (!option) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Найдена некорректная дата голосования.",
          path: ["selections", index, "date"],
        });
        continue;
      }

      if (seenDates.has(selection.date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Одна и та же дата не должна повторяться.",
          path: ["selections", index, "date"],
        });
      } else {
        seenDates.add(selection.date);
      }

      if (selection.day !== option.weekday) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Для даты указан неверный день недели.",
          path: ["selections", index, "day"],
        });
      }

      const uniqueSlots = new Set(selection.slots);

      if (uniqueSlots.size !== selection.slots.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Слоты внутри одной даты не должны повторяться.",
          path: ["selections", index, "slots"],
        });
      }

      for (const slot of uniqueSlots) {
        if (!option.slots.includes(slot)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Для этой даты выбран недоступный слот.",
            path: ["selections", index, "slots"],
          });
        }
      }

      totalSelectedSlots += uniqueSlots.size;
    }

    if (totalSelectedSlots === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Нужно выбрать хотя бы один слот.",
        path: ["selections"],
      });
    }
  });

export const commentPayloadSchema = z.object({
  authorName: fullNameSchema,
  text: z
    .string()
    .transform(sanitizeText)
    .refine((value) => value.length > 0, {
      message: "Комментарий не может быть пустым.",
    })
    .refine((value) => value.length <= 500, {
      message: "Комментарий должен быть короче 500 символов.",
    }),
});
