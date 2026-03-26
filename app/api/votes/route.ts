import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/api";
import {
  deserializeSelectionsFromStorage,
  serializeSelectionsForStorage,
  sortSelections,
} from "@/lib/dates";
import { normalizeFullName, votePayloadSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function serializeVote(vote: {
  id: number;
  fullName: string;
  normalizedFullName: string;
  selectedDates: string[];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: vote.id,
    fullName: vote.fullName,
    normalizedFullName: vote.normalizedFullName,
    selections: deserializeSelectionsFromStorage(vote.selectedDates),
    createdAt: vote.createdAt.toISOString(),
    updatedAt: vote.updatedAt.toISOString(),
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
    const votes = await prisma.vote.findMany({
      orderBy: {
        fullName: "asc",
      },
    });

    return NextResponse.json({
      votes: votes.map(serializeVote),
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
    const payload = votePayloadSchema.parse(json);
    const normalizedFullName = normalizeFullName(payload.fullName);
    const selections = sortSelections(payload.selections);
    const selectedDates = serializeSelectionsForStorage(selections);

    const vote = await prisma.vote.upsert({
      where: {
        normalizedFullName,
      },
      create: {
        fullName: payload.fullName,
        normalizedFullName,
        selectedDates,
      },
      update: {
        fullName: payload.fullName,
        selectedDates,
      },
    });

    return NextResponse.json({
      vote: serializeVote(vote),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
