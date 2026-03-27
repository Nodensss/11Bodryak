import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const hidden = await prisma.hiddenVenue.findMany();

    return NextResponse.json({
      hiddenVenueIds: hidden.map((h) => h.venueId),
    });
  } catch {
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера." },
      { status: 500 },
    );
  }
}
