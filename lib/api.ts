import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: error.issues[0]?.message ?? "Некорректные данные.",
      },
      { status: 400 },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: "Внутренняя ошибка сервера.",
    },
    { status: 500 },
  );
}
