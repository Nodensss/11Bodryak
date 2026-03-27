import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/api";
import { fullNameSchema, normalizeFullName } from "@/lib/validation";
import { VENUE_MAP } from "@/lib/venues";

const venueVotePayloadSchema = z.object({
  fullName: fullNameSchema,
  venueIds: z
    .array(z.string())
    .min(1, "Выбери минимум одно место.")
    .max(VENUE_MAP.size, "Слишком много мест.")
    .refine(
      (ids) => ids.every((id) => VENUE_MAP.has(id)),
      "Выбрано несуществующее заведение.",
    )
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Заведения не должны повторяться.",
    ),
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const venueVotes = await prisma.venueVote.findMany({
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({
      venueVotes: venueVotes.map((v) => ({
        id: v.id,
        fullName: v.fullName,
        normalizedFullName: v.normalizedFullName,
        venueIds: v.venueIds,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = venueVotePayloadSchema.parse(await request.json());
    const normalized = normalizeFullName(payload.fullName);

    const venueVote = await prisma.venueVote.upsert({
      where: { normalizedFullName: normalized },
      create: {
        fullName: payload.fullName,
        normalizedFullName: normalized,
        venueIds: payload.venueIds,
      },
      update: {
        fullName: payload.fullName,
        venueIds: payload.venueIds,
      },
    });

    return NextResponse.json({
      venueVote: {
        id: venueVote.id,
        fullName: venueVote.fullName,
        normalizedFullName: venueVote.normalizedFullName,
        venueIds: venueVote.venueIds,
        createdAt: venueVote.createdAt.toISOString(),
        updatedAt: venueVote.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
