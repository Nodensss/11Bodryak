import { z } from "zod";
import { DATE_VALUE_SET } from "@/lib/dates";

const CYRILLIC_FULL_NAME_REGEX =
  /^[А-ЯЁа-яё-]+(?: [А-ЯЁа-яё-]+)+$/;

export function sanitizeText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

export function normalizeFullName(value: string): string {
  return sanitizeText(value).toLocaleLowerCase("ru-RU");
}

export const fullNameSchema = z
  .string()
  .transform(sanitizeText)
  .refine((value) => CYRILLIC_FULL_NAME_REGEX.test(value), {
    message:
      "Укажи фамилию и имя кириллицей. Допустимы пробелы и дефисы.",
  })
  .refine((value) => value.split(" ").length >= 2, {
    message: "Нужно минимум два слова: фамилия и имя.",
  })
  .refine((value) => value.length <= 100, {
    message: "Имя слишком длинное.",
  });

export const votePayloadSchema = z.object({
  fullName: fullNameSchema,
  selectedDates: z
    .array(z.string())
    .min(1, "Выбери минимум одну дату.")
    .max(DATE_VALUE_SET.size, "Слишком много дат.")
    .superRefine((values, ctx) => {
      const uniqueValues = new Set(values);

      if (uniqueValues.size !== values.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Найдены повторяющиеся даты.",
        });
      }

      for (const value of uniqueValues) {
        if (!DATE_VALUE_SET.has(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Найдена некорректная дата голосования.",
          });
        }
      }
    }),
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
