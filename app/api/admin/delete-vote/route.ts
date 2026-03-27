import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdminConfigured, isValidAdminSecret } from "@/lib/admin";
import { errorResponse } from "@/lib/api";

const payloadSchema = z.object({
  secret: z.string().trim().min(1, "Нужен админ-ключ."),
  voteId: z.number().int().positive("Неверный ID голоса."),
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

    const vote = await prisma.vote.findUnique({
      where: { id: payload.voteId },
    });

    if (!vote) {
      return NextResponse.json(
        { error: "Голос не найден." },
        { status: 404 },
      );
    }

    await prisma.vote.delete({
      where: { id: payload.voteId },
    });

    return NextResponse.json({
      ok: true,
      deletedVote: { id: vote.id, fullName: vote.fullName },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Неверный payload." },
        { status: 400 },
      );
    }

    return errorResponse(error);
  }
}
