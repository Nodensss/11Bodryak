import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdminConfigured, isValidAdminSecret } from "@/lib/admin";
import { errorResponse } from "@/lib/api";

const payloadSchema = z.object({
  secret: z.string().trim().min(1, "Нужен админ-ключ."),
  scope: z.enum(["votes", "comments", "all"]),
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

    if (payload.scope === "votes") {
      await prisma.vote.deleteMany();
    } else if (payload.scope === "comments") {
      await prisma.comment.deleteMany();
    } else {
      await prisma.$transaction([
        prisma.comment.deleteMany(),
        prisma.vote.deleteMany(),
      ]);
    }

    return NextResponse.json({ ok: true, scope: payload.scope });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Неверный admin payload." },
        { status: 400 },
      );
    }

    return errorResponse(error);
  }
}
