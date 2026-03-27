"use client";

import { useEffect, useState } from "react";
import type { VoteRecord } from "@/lib/types";

type AdminScope = "votes" | "comments" | "all";

type AdminPanelProps = {
  onReset: (scope: AdminScope) => void;
  onDeleteVote: (voteId: number, fullName: string) => void;
  votes: VoteRecord[];
};

const STORAGE_KEY = "class-reunion-admin-secret";

export default function AdminPanel({ onReset, onDeleteVote, votes }: AdminPanelProps) {
  const [secret, setSecret] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showVoterList, setShowVoterList] = useState(false);

  useEffect(() => {
    const storedSecret = window.localStorage.getItem(STORAGE_KEY);

    if (storedSecret) {
      setSecret(storedSecret);
      void verifySecret(storedSecret, false);
    }
  }, []);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccess(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [success]);

  async function verifySecret(secretValue: string, persist = true) {
    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: secretValue,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось проверить админ-ключ.");
      }

      if (persist) {
        window.localStorage.setItem(STORAGE_KEY, secretValue);
      }

      setIsUnlocked(true);
      setError(null);
      setSuccess("Админ-режим разблокирован.");
    } catch (verifyError) {
      window.localStorage.removeItem(STORAGE_KEY);
      setIsUnlocked(false);
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Не удалось проверить админ-ключ.",
      );
    }
  }

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await verifySecret(secret);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReset(scope: AdminScope) {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret,
          scope,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось очистить данные.");
      }

      onReset(scope);
      setSuccess(
        scope === "votes"
          ? "Голоса очищены."
          : scope === "comments"
            ? "Комментарии очищены."
            : "Голоса и комментарии очищены.",
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Не удалось очистить данные.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteVote(voteId: number, fullName: string) {
    setError(null);
    setSuccess(null);
    setDeletingId(voteId);

    try {
      const response = await fetch("/api/admin/delete-vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret,
          voteId,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось удалить голос.");
      }

      onDeleteVote(voteId, fullName);
      setSuccess(`Голос «${fullName}» удалён.`);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Не удалось удалить голос.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const sortedVotes = [...votes].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "ru"),
  );

  return (
    <div className="rounded-[28px] border border-ink/10 bg-gradient-to-br from-slate-50 via-white to-sky/30 p-5 shadow-card backdrop-blur sm:p-7">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink/5 text-lg">
          🔐
        </div>
        <div>
          <h3 className="text-xl font-semibold text-ink">Админ-панель</h3>
          <p className="mt-1 text-sm leading-6 text-ink/55">
            Управление голосами и комментариями. Нужен серверный ключ.
          </p>
        </div>
      </div>

      {!isUnlocked ? (
        <form className="space-y-4" onSubmit={handleUnlock}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink" htmlFor="adminSecret">
              Админ-ключ
            </label>
            <input
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              id="adminSecret"
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Введи секрет для управления данными"
              type="password"
              value={secret}
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {success}
            </div>
          ) : null}

          <button
            className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting || !secret.trim()}
            type="submit"
          >
            {isSubmitting ? "Проверяем..." : "Разблокировать"}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
            <span className="text-base">✅</span>
            Админ-режим активен
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {success}
            </div>
          ) : null}

          {/* Mass actions */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
              Массовые действия
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center justify-center rounded-full border border-ink/10 bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                onClick={() => void handleReset("votes")}
                type="button"
              >
                Очистить голоса
              </button>
              <button
                className="inline-flex items-center justify-center rounded-full border border-ink/10 bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                onClick={() => void handleReset("comments")}
                type="button"
              >
                Очистить комментарии
              </button>
              <button
                className="inline-flex items-center justify-center rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                onClick={() => void handleReset("all")}
                type="button"
              >
                Очистить всё
              </button>
            </div>
          </div>

          {/* Delete individual votes */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Удалить голос конкретного человека
              </p>
              {sortedVotes.length > 0 && (
                <button
                  className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/60 transition hover:bg-ink/10 hover:text-ink"
                  onClick={() => setShowVoterList(!showVoterList)}
                  type="button"
                >
                  {showVoterList ? "Скрыть" : `Показать (${sortedVotes.length})`}
                </button>
              )}
            </div>

            {sortedVotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/10 bg-white/50 px-4 py-4 text-sm text-ink/50">
                Нет голосов для удаления.
              </div>
            ) : showVoterList ? (
              <div className="space-y-2">
                {sortedVotes.map((vote) => {
                  const isDeleting = deletingId === vote.id;

                  return (
                    <div
                      className="flex items-center justify-between gap-3 rounded-2xl border border-ink/8 bg-white px-4 py-3 shadow-sm transition hover:border-ink/15"
                      key={vote.id}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {vote.fullName}
                        </p>
                        <p className="text-xs text-ink/45">
                          {vote.selections.length} дат выбрано
                        </p>
                      </div>
                      <button
                        className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isDeleting || isSubmitting}
                        onClick={() => void handleDeleteVote(vote.id, vote.fullName)}
                        type="button"
                      >
                        {isDeleting ? "Удаляем..." : "Удалить"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
