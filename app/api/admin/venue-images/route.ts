import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdminConfigured, isValidAdminSecret } from "@/lib/admin";
import { errorResponse } from "@/lib/api";
import { VENUE_MAP } from "@/lib/venues";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB base64

const uploadSchema = z.object({
  secret: z.string().trim().min(1, "Нужен админ-ключ."),
  venueId: z.string().refine((id) => VENUE_MAP.has(id), "Неизвестное заведение."),
  imageData: z
    .string()
    .min(1, "Изображение пустое.")
    .refine(
      (data) => data.length <= MAX_IMAGE_SIZE,
      "Файл слишком большой, максимум 2 МБ.",
    ),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"], {
    error: "Допустимые форматы: jpg, png, webp.",
  }),
});

const deleteSchema = z.object({
  secret: z.string().trim().min(1, "Нужен админ-ключ."),
  venueId: z.string().refine((id) => VENUE_MAP.has(id), "Неизвестное заведение."),
});

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_SECRET не настроен на сервере." },
      { status: 503 },
    );
  }

  try {
    const payload = uploadSchema.parse(await request.json());

    if (!isValidAdminSecret(payload.secret)) {
      return NextResponse.json(
        { error: "Неверный админ-ключ." },
        { status: 401 },
      );
    }

    await prisma.venueImage.upsert({
      where: { venueId: payload.venueId },
      create: {
        venueId: payload.venueId,
        imageData: payload.imageData,
        mimeType: payload.mimeType,
      },
      update: {
        imageData: payload.imageData,
        mimeType: payload.mimeType,
      },
    });

    return NextResponse.json({ ok: true, venueId: payload.venueId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Неверные данные." },
        { status: 400 },
      );
    }

    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_SECRET не настроен на сервере." },
      { status: 503 },
    );
  }

  try {
    const payload = deleteSchema.parse(await request.json());

    if (!isValidAdminSecret(payload.secret)) {
      return NextResponse.json(
        { error: "Неверный админ-ключ." },
        { status: 401 },
      );
    }

    const existing = await prisma.venueImage.findUnique({
      where: { venueId: payload.venueId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Фото не найдено." },
        { status: 404 },
      );
    }

    await prisma.venueImage.delete({
      where: { venueId: payload.venueId },
    });

    return NextResponse.json({ ok: true, venueId: payload.venueId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Неверные данные." },
        { status: 400 },
      );
    }

    return errorResponse(error);
  }
}
