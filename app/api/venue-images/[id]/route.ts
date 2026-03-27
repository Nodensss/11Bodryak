import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const image = await prisma.venueImage.findUnique({
      where: { venueId: id },
    });

    if (!image) {
      return NextResponse.json(
        { error: "Фото не найдено." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      venueId: image.venueId,
      imageData: image.imageData,
      mimeType: image.mimeType,
    });
  } catch {
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера." },
      { status: 500 },
    );
  }
}
