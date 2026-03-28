import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/api";
import { fullNameSchema } from "@/lib/validation";

const createSchema = z.object({
  venueId: z.string().min(1),
  authorName: fullNameSchema,
  text: z
    .string()
    .trim()
    .min(1, "Комментарий не может быть пустым.")
    .max(500, "Комментарий слишком длинный (макс. 500 символов)."),
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");

    const where = venueId ? { venueId } : {};

    const comments = await prisma.venueComment.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      venueComments: comments.map((c) => ({
        id: c.id,
        venueId: c.venueId,
        authorName: c.authorName,
        text: c.text,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = createSchema.parse(await request.json());

    const comment = await prisma.venueComment.create({
      data: {
        venueId: payload.venueId,
        authorName: payload.authorName,
        text: payload.text,
      },
    });

    return NextResponse.json({
      venueComment: {
        id: comment.id,
        venueId: comment.venueId,
        authorName: comment.authorName,
        text: comment.text,
        createdAt: comment.createdAt.toISOString(),
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
