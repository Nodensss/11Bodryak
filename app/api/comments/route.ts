import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/api";
import { commentPayloadSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function serializeComment(comment: {
  id: number;
  authorName: string;
  text: string;
  createdAt: Date;
}) {
  return {
    id: comment.id,
    authorName: comment.authorName,
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
  };
}

function databaseUnavailable() {
  return !process.env.DATABASE_URL;
}

export async function GET() {
  if (databaseUnavailable()) {
    return NextResponse.json(
      { error: "Не настроена переменная DATABASE_URL." },
      { status: 503 },
    );
  }

  try {
    const comments = await prisma.comment.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      comments: comments.map(serializeComment),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  if (databaseUnavailable()) {
    return NextResponse.json(
      { error: "Не настроена переменная DATABASE_URL." },
      { status: 503 },
    );
  }

  try {
    const json = await request.json();
    const payload = commentPayloadSchema.parse(json);

    const comment = await prisma.comment.create({
      data: {
        authorName: payload.authorName,
        text: payload.text,
      },
    });

    return NextResponse.json({
      comment: serializeComment(comment),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
