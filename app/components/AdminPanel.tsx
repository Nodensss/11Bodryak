"use client";

import { useEffect, useState } from "react";

type AdminScope = "votes" | "comments" | "all";

type AdminPanelProps = {
  onReset: (scope: AdminScope) => void;
};

const STORAGE_KEY = "class-reunion-admin-secret";

export default function AdminPanel({ onReset }: AdminPanelProps) {
  const [secret, setSecret] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  return (
    <div className="rounded-[28px] border border-sky/70 bg-white/80 p-5 shadow-card backdrop-blur sm:p-7">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-ink">Админ-панель</h3>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          Можно очистить старые голоса и комментарии прямо с сайта. Для этого
          нужен `ADMIN_SECRET`, настроенный на сервере.
        </p>
      </div>

      {!isUnlocked ? (
        <form className="space-y-4" onSubmit={handleUnlock}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink" htmlFor="adminSecret">
              Админ-ключ
            </label>
            <input
              className="w-full rounded-2xl border border-sky/80 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
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
            className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-accent/50"
            disabled={isSubmitting || !secret.trim()}
            type="submit"
          >
            {isSubmitting ? "Проверяем..." : "Разблокировать админ-режим"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Админ-режим активен на этом устройстве.
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

          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full border border-accent/20 bg-white px-5 py-3 text-sm font-semibold text-accent transition hover:border-accent hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={() => void handleReset("votes")}
              type="button"
            >
              Очистить голоса
            </button>
            <button
              className="inline-flex items-center justify-center rounded-full border border-accent/20 bg-white px-5 py-3 text-sm font-semibold text-accent transition hover:border-accent hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={() => void handleReset("comments")}
              type="button"
            >
              Очистить комментарии
            </button>
            <button
              className="inline-flex items-center justify-center rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
              disabled={isSubmitting}
              onClick={() => void handleReset("all")}
              type="button"
            >
              Очистить всё
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
