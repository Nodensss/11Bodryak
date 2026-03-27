import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdminConfigured, isValidAdminSecret } from "@/lib/admin";
import { errorResponse } from "@/lib/api";
import { VENUE_MAP } from "@/lib/venues";

const payloadSchema = z.object({
  secret: z.string().trim().min(1, "Нужен админ-ключ."),
  venueId: z.string().refine((id) => VENUE_MAP.has(id), "Неизвестное заведение."),
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_SECRET не настроен на сервере." },
      { status: 503 },
    );
  }

  try {
    const payload = payloadSchema.parse(await request.json());

    if (!isValidAdminSecret(payload.secret)) {
      return NextResponse.json(
        { error: "Неверный админ-ключ." },
        { status: 401 },
      );
    }

    const existing = await prisma.hiddenVenue.findUnique({
      where: { venueId: payload.venueId },
    });

    if (existing) {
      await prisma.hiddenVenue.delete({
        where: { venueId: payload.venueId },
      });
      return NextResponse.json({
        ok: true,
        venueId: payload.venueId,
        hidden: false,
      });
    } else {
      await prisma.hiddenVenue.create({
        data: { venueId: payload.venueId },
      });
      return NextResponse.json({
        ok: true,
        venueId: payload.venueId,
        hidden: true,
      });
    }
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
