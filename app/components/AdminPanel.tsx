"use client";

import { useEffect, useRef, useState } from "react";
import type { VoteRecord, VenueVoteRecord } from "@/lib/types";
import { VENUES, VENUE_MAP } from "@/lib/venues";

type AdminScope = "votes" | "comments" | "all";

type AdminPanelProps = {
  onReset: (scope: AdminScope) => void;
  onDeleteVote: (voteId: number, fullName: string) => void;
  onDeleteVenueVote: (voteId: number, fullName: string) => void;
  onVenueImageChanged: () => void;
  onHiddenVenuesChanged: () => void;
  hiddenVenueIds: Set<string>;
  votes: VoteRecord[];
  venueVotes: VenueVoteRecord[];
};

type VenueImageState = {
  loaded: boolean;
  url: string | null;
};

const STORAGE_KEY = "class-reunion-admin-secret";
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const TARGET_WIDTH = 800;

function resizeImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > TARGET_WIDTH) {
          height = Math.round((height * TARGET_WIDTH) / width);
          width = TARGET_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const quality = mimeType === "image/jpeg" ? 0.85 : undefined;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = dataUrl.split(",")[1];

        if (!base64) {
          reject(new Error("Failed to encode image"));
          return;
        }

        resolve({ base64, mimeType });
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function AdminPanel({
  onReset,
  onDeleteVote,
  onDeleteVenueVote,
  onVenueImageChanged,
  onHiddenVenuesChanged,
  hiddenVenueIds,
  votes,
  venueVotes,
}: AdminPanelProps) {
  const [secret, setSecret] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showVoterList, setShowVoterList] = useState(false);
  const [showVenueVoterList, setShowVenueVoterList] = useState(false);
  const [deletingVenueVoteId, setDeletingVenueVoteId] = useState<number | null>(null);
  const [showVenueImages, setShowVenueImages] = useState(false);
  const [venueImages, setVenueImages] = useState<Record<string, VenueImageState>>({});
  const [uploadingVenueId, setUploadingVenueId] = useState<string | null>(null);
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingVenueId, setPendingVenueId] = useState<string | null>(null);
  const [togglingVenueId, setTogglingVenueId] = useState<string | null>(null);
  const [showVenueVisibility, setShowVenueVisibility] = useState(false);

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

  useEffect(() => {
    if (!isUnlocked || !showVenueImages) return;
    void loadVenueImages();
  }, [isUnlocked, showVenueImages]);

  async function loadVenueImages() {
    for (const venue of VENUES) {
      try {
        const response = await fetch(`/api/venue-images/${venue.id}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const data = (await response.json()) as {
            imageData: string;
            mimeType: string;
          };
          setVenueImages((prev) => ({
            ...prev,
            [venue.id]: {
              loaded: true,
              url: `data:${data.mimeType};base64,${data.imageData}`,
            },
          }));
        } else {
          setVenueImages((prev) => ({
            ...prev,
            [venue.id]: { loaded: true, url: null },
          }));
        }
      } catch {
        setVenueImages((prev) => ({
          ...prev,
          [venue.id]: { loaded: true, url: null },
        }));
      }
    }
  }

  async function verifySecret(secretValue: string, persist = true) {
    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secretValue }),
      });
      const payload = (await response.json()) as { error?: string };

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, scope }),
      });
      const payload = (await response.json()) as { error?: string };
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, voteId }),
      });
      const payload = (await response.json()) as { error?: string };
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

  async function handleDeleteVenueVote(voteId: number, fullName: string) {
    setError(null);
    setSuccess(null);
    setDeletingVenueVoteId(voteId);
    try {
      const response = await fetch("/api/admin/delete-venue-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, voteId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось удалить голос за место.");
      }
      onDeleteVenueVote(voteId, fullName);
      setSuccess(`Голос за место «${fullName}» удалён.`);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Не удалось удалить голос за место.",
      );
    } finally {
      setDeletingVenueVoteId(null);
    }
  }

  function handleFilePickerOpen(venueId: string) {
    setPendingVenueId(venueId);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";

    if (!file || !pendingVenueId) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Допустимые форматы: jpg, png, webp.");
      setPendingVenueId(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE * 2) {
      setError("Файл слишком большой, максимум 2 МБ.");
      setPendingVenueId(null);
      return;
    }

    setError(null);
    setSuccess(null);
    setUploadingVenueId(pendingVenueId);

    try {
      const { base64, mimeType } = await resizeImage(file);

      if (base64.length > MAX_FILE_SIZE) {
        throw new Error("Файл слишком большой после сжатия, максимум 2 МБ.");
      }

      const response = await fetch("/api/admin/venue-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          venueId: pendingVenueId,
          imageData: base64,
          mimeType,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось загрузить фото.");
      }

      setVenueImages((prev) => ({
        ...prev,
        [pendingVenueId!]: {
          loaded: true,
          url: `data:${mimeType};base64,${base64}`,
        },
      }));
      setSuccess("Фото загружено.");
      onVenueImageChanged();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Не удалось загрузить фото.",
      );
    } finally {
      setUploadingVenueId(null);
      setPendingVenueId(null);
    }
  }

  async function handleDeleteVenueImage(venueId: string) {
    setError(null);
    setSuccess(null);
    setDeletingVenueId(venueId);
    try {
      const response = await fetch("/api/admin/venue-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, venueId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось удалить фото.");
      }
      setVenueImages((prev) => ({
        ...prev,
        [venueId]: { loaded: true, url: null },
      }));
      setSuccess("Фото удалено.");
      onVenueImageChanged();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Не удалось удалить фото.",
      );
    } finally {
      setDeletingVenueId(null);
    }
  }

  async function handleToggleVenueVisibility(venueId: string, venueName: string) {
    setError(null);
    setSuccess(null);
    setTogglingVenueId(venueId);
    try {
      const response = await fetch("/api/admin/hidden-venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, venueId }),
      });
      const payload = (await response.json()) as {
        error?: string;
        hidden?: boolean;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось изменить видимость.");
      }
      onHiddenVenuesChanged();
      setSuccess(
        payload.hidden
          ? `«${venueName}» скрыто из голосования.`
          : `«${venueName}» возвращено в голосование.`,
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Не удалось изменить видимость.",
      );
    } finally {
      setTogglingVenueId(null);
    }
  }

  const sortedVotes = [...votes].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "ru"),
  );

  const sortedVenueVotes = [...venueVotes].sort((a, b) =>
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
            Управление голосами, комментариями и фото заведений.
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelected}
        type="file"
      />

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

          {/* Delete individual venue votes */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Удалить голос за место
              </p>
              {sortedVenueVotes.length > 0 && (
                <button
                  className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/60 transition hover:bg-ink/10 hover:text-ink"
                  onClick={() => setShowVenueVoterList(!showVenueVoterList)}
                  type="button"
                >
                  {showVenueVoterList ? "Скрыть" : `Показать (${sortedVenueVotes.length})`}
                </button>
              )}
            </div>

            {sortedVenueVotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/10 bg-white/50 px-4 py-4 text-sm text-ink/50">
                Нет голосов за место для удаления.
              </div>
            ) : showVenueVoterList ? (
              <div className="space-y-2">
                {sortedVenueVotes.map((vote) => {
                  const isDeleting = deletingVenueVoteId === vote.id;
                  const venueNames = vote.venueIds
                    .map((id) => VENUE_MAP.get(id)?.name ?? id)
                    .join(", ");
                  return (
                    <div
                      className="flex items-center justify-between gap-3 rounded-2xl border border-ink/8 bg-white px-4 py-3 shadow-sm transition hover:border-ink/15"
                      key={vote.id}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {vote.fullName}
                        </p>
                        <p className="truncate text-xs text-ink/45">
                          {vote.venueIds.length} мест: {venueNames}
                        </p>
                      </div>
                      <button
                        className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isDeleting || isSubmitting}
                        onClick={() => void handleDeleteVenueVote(vote.id, vote.fullName)}
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

          {/* Venue visibility management */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Видимость заведений в голосовании
              </p>
              <button
                className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/60 transition hover:bg-ink/10 hover:text-ink"
                onClick={() => setShowVenueVisibility(!showVenueVisibility)}
                type="button"
              >
                {showVenueVisibility
                  ? "Скрыть"
                  : `Показать (${hiddenVenueIds.size} скрыто)`}
              </button>
            </div>

            {showVenueVisibility && (
              <div className="space-y-2">
                {VENUES.map((venue) => {
                  const isHidden = hiddenVenueIds.has(venue.id);
                  const isToggling = togglingVenueId === venue.id;

                  return (
                    <div
                      className={`flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm transition ${
                        isHidden ? "border-rose-200 opacity-60" : "border-ink/8"
                      }`}
                      key={venue.id}
                    >
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${isHidden ? "text-ink/40 line-through" : "text-ink"}`}>
                          {venue.name}
                        </p>
                        <p className="text-xs text-ink/40">{venue.category}</p>
                      </div>
                      <button
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          isHidden
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                            : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white"
                        }`}
                        disabled={isToggling}
                        onClick={() =>
                          void handleToggleVenueVisibility(venue.id, venue.name)
                        }
                        type="button"
                      >
                        {isToggling
                          ? "..."
                          : isHidden
                            ? "Вернуть"
                            : "Скрыть"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Venue image management */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Управление фото заведений
              </p>
              <button
                className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/60 transition hover:bg-ink/10 hover:text-ink"
                onClick={() => setShowVenueImages(!showVenueImages)}
                type="button"
              >
                {showVenueImages ? "Скрыть" : `Показать (${VENUES.length})`}
              </button>
            </div>

            {showVenueImages && (
              <div className="space-y-2">
                {VENUES.map((venue) => {
                  const imageState = venueImages[venue.id];
                  const hasImage = imageState?.loaded && imageState.url;
                  const isUploading = uploadingVenueId === venue.id;
                  const isImageDeleting = deletingVenueId === venue.id;

                  return (
                    <div
                      className="flex items-center gap-3 rounded-2xl border border-ink/8 bg-white px-4 py-3 shadow-sm"
                      key={venue.id}
                    >
                      {/* Thumbnail */}
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-ink/5">
                        {hasImage ? (
                          <img
                            alt={venue.name}
                            className="h-full w-full object-cover"
                            src={imageState.url!}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-ink/30">
                            Нет
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {venue.name}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 gap-2">
                        <button
                          className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isUploading || isImageDeleting}
                          onClick={() => handleFilePickerOpen(venue.id)}
                          type="button"
                        >
                          {isUploading ? "Загрузка..." : "Загрузить"}
                        </button>
                        {hasImage && (
                          <button
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isUploading || isImageDeleting}
                            onClick={() =>
                              void handleDeleteVenueImage(venue.id)
                            }
                            type="button"
                          >
                            {isImageDeleting ? "Удаляем..." : "Удалить"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
