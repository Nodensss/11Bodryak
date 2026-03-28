import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/api";
import { fullNameSchema } from "@/lib/validation";

const createPayloadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Название должно содержать минимум 2 символа.")
    .max(100, "Название слишком длинное."),
  city: z
    .string()
    .trim()
    .min(2, "Укажи город.")
    .max(50, "Название города слишком длинное."),
  address: z
    .string()
    .trim()
    .min(3, "Укажи адрес.")
    .max(200, "Адрес слишком длинный."),
  reason: z
    .string()
    .trim()
    .min(3, "Укажи причину выбора.")
    .max(500, "Причина слишком длинная."),
  createdBy: fullNameSchema,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const customVenues = await prisma.customVenue.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      customVenues: customVenues.map((v) => ({
        id: v.id,
        name: v.name,
        city: v.city,
        address: v.address,
        reason: v.reason,
        createdBy: v.createdBy,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = createPayloadSchema.parse(await request.json());

    const venue = await prisma.customVenue.create({
      data: {
        name: payload.name,
        city: payload.city,
        address: payload.address,
        reason: payload.reason,
        createdBy: payload.createdBy,
      },
    });

    return NextResponse.json({
      customVenue: {
        id: venue.id,
        name: venue.name,
        city: venue.city,
        address: venue.address,
        reason: venue.reason,
        createdBy: venue.createdBy,
        createdAt: venue.createdAt.toISOString(),
      },
    });
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
