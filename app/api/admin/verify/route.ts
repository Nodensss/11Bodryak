import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminConfigured, isValidAdminSecret } from "@/lib/admin";

const payloadSchema = z.object({
  secret: z.string().trim().min(1, "Нужен админ-ключ."),
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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Неверный формат админ-запроса." },
      { status: 400 },
    );
  }
}
