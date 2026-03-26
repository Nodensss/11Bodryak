"use client";

import { useEffect, useState } from "react";
import { ZodError } from "zod";
import { formatDisplayDateTime } from "@/lib/dates";
import type { CommentRecord } from "@/lib/types";
import { commentPayloadSchema } from "@/lib/validation";

type CommentSectionProps = {
  comments: CommentRecord[];
  initialAuthorName?: string;
  onCreated: (comment: CommentRecord) => void;
};

export default function CommentSection({
  comments,
  initialAuthorName = "",
  onCreated,
}: CommentSectionProps) {
  const [authorName, setAuthorName] = useState(initialAuthorName);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authorName && initialAuthorName) {
      setAuthorName(initialAuthorName);
    }
  }, [authorName, initialAuthorName]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const payload = commentPayloadSchema.parse({
        authorName,
        text,
      });

      setIsSubmitting(true);

      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        comment?: CommentRecord;
        error?: string;
      };

      if (!response.ok || !data.comment) {
        throw new Error(data.error ?? "Не удалось отправить комментарий.");
      }

      setText("");
      onCreated(data.comment);
    } catch (submitError) {
      if (submitError instanceof ZodError) {
        setError(submitError.issues[0]?.message ?? "Проверь введённые данные.");
      } else if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Не удалось отправить комментарий.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-sky/70 bg-white/80 p-5 shadow-card backdrop-blur sm:p-7">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-ink">Комментарии</h3>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          Можно обсудить даты, формат встречи и любые организационные детали.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-ink"
              htmlFor="commentAuthorName"
            >
              Фамилия Имя
            </label>
            <input
              className="w-full rounded-2xl border border-sky/80 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              id="commentAuthorName"
              maxLength={100}
              onChange={(event) => setAuthorName(event.target.value)}
              placeholder="Иванов Иван"
              value={authorName}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink" htmlFor="commentText">
              Комментарий
            </label>
            <textarea
              className="min-h-[132px] w-full rounded-2xl border border-sky/80 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              id="commentText"
              maxLength={500}
              onChange={(event) => setText(event.target.value)}
              placeholder="Например: мне удобнее суббота, потому что в пятницу поздно освобождаюсь."
              value={text}
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink/55">До 500 символов, новые сообщения сверху.</p>
          <button
            className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-accent/50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Отправляем..." : "Отправить комментарий"}
          </button>
        </div>
      </form>

      <div className="mt-8 space-y-4">
        {comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sky/90 bg-paper px-4 py-5 text-sm text-ink/60">
            Комментариев пока нет.
          </div>
        ) : (
          comments.map((comment) => (
            <article
              className="rounded-2xl border border-sky/60 bg-paper px-4 py-4"
              key={comment.id}
            >
              <div className="text-sm text-ink/65">
                <span className="font-semibold text-ink">{comment.authorName}</span> —{" "}
                {formatDisplayDateTime(comment.createdAt)}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/85">
                {comment.text}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
