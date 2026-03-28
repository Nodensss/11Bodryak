"use client";

import { useEffect, useState } from "react";
import { ZodError } from "zod";
import { VENUES, CATEGORY_COLORS } from "@/lib/venues";
import type { Venue } from "@/lib/venues";
import type { CustomVenueRecord, VenueCommentRecord, VenueVoteRecord } from "@/lib/types";
import { fullNameSchema } from "@/lib/validation";

type VenueVoteFormProps = {
  initialFullName?: string;
  initialVenueIds?: string[];
  hiddenVenueIds: Set<string>;
  customVenues: CustomVenueRecord[];
  venueVotes: VenueVoteRecord[];
  onSubmitted: (vote: { fullName: string; venueIds: string[] }) => void;
  onCustomVenueCreated: (venue: CustomVenueRecord) => void;
};

type VenueImageCache = Record<string, string | null>;

export default function VenueVoteForm({
  initialFullName = "",
  initialVenueIds = [],
  hiddenVenueIds,
  customVenues,
  venueVotes,
  onSubmitted,
  onCustomVenueCreated,
}: VenueVoteFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialVenueIds));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageCache, setImageCache] = useState<VenueImageCache>({});
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggestCity, setSuggestCity] = useState("Томск");
  const [suggestAddress, setSuggestAddress] = useState("");
  const [suggestReason, setSuggestReason] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [venueComments, setVenueComments] = useState<VenueCommentRecord[]>([]);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [postingCommentId, setPostingCommentId] = useState<string | null>(null);

  const activeVenues = VENUES.filter((v) => !hiddenVenueIds.has(v.id));
  const hiddenVenues = VENUES.filter((v) => hiddenVenueIds.has(v.id));

  useEffect(() => {
    setFullName(initialFullName);
    setSelectedIds(new Set(initialVenueIds));
  }, [initialFullName, initialVenueIds]);

  useEffect(() => {
    for (const venue of activeVenues) {
      if (imageCache[venue.id] !== undefined) continue;
      setImageCache((c) => ({ ...c, [venue.id]: null }));
      fetch(`/api/venue-images/${venue.id}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { imageData?: string; mimeType?: string } | null) => {
          if (data?.imageData && data.mimeType) {
            setImageCache((c) => ({
              ...c,
              [venue.id]: `data:${data.mimeType};base64,${data.imageData}`,
            }));
          }
        })
        .catch(() => {});
    }

    // Load venue comments
    fetch("/api/venue-comments", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { venueComments?: VenueCommentRecord[] } | null) => {
        if (data?.venueComments) {
          setVenueComments(data.venueComments);
        }
      })
      .catch(() => {});
  }, []);

  function handleToggle(venueId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(venueId)) {
        next.delete(venueId);
      } else {
        next.add(venueId);
      }
      return next;
    });
  }

  function handleCardTap(venueId: string) {
    setExpandedId((current) => (current === venueId ? null : venueId));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const parsedName = fullNameSchema.parse(fullName);
      const venueIds = [...selectedIds].filter((id) => !hiddenVenueIds.has(id));

      if (venueIds.length === 0) {
        setError("Выбери минимум одно место.");
        return;
      }

      setIsSubmitting(true);

      const response = await fetch("/api/venue-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: parsedName, venueIds }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось сохранить голос.");
      }

      onSubmitted({ fullName: parsedName, venueIds });
    } catch (submitError) {
      if (submitError instanceof ZodError) {
        setError(submitError.issues[0]?.message ?? "Проверь введённые данные.");
      } else if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Не удалось сохранить голос.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePostComment(venueId: string) {
    const text = commentText[venueId]?.trim();
    if (!text) return;

    let authorName: string;
    try {
      authorName = fullNameSchema.parse(fullName);
    } catch {
      setError("Введи Фамилия Имя внизу, чтобы оставить комментарий.");
      return;
    }

    setPostingCommentId(venueId);
    try {
      const response = await fetch("/api/venue-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, authorName, text }),
      });
      const data = (await response.json()) as {
        venueComment?: VenueCommentRecord;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось отправить комментарий.");
      }
      if (data.venueComment) {
        setVenueComments((prev) => [data.venueComment!, ...prev]);
      }
      setCommentText((prev) => ({ ...prev, [venueId]: "" }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось отправить комментарий.",
      );
    } finally {
      setPostingCommentId(null);
    }
  }

  async function handleSuggestVenue() {
    setSuggestError(null);

    if (!suggestName.trim() || !suggestAddress.trim() || !suggestReason.trim()) {
      setSuggestError("Заполни все поля.");
      return;
    }

    let createdBy: string;
    try {
      createdBy = fullNameSchema.parse(fullName);
    } catch {
      setSuggestError("Сначала введи своё Фамилия Имя внизу формы.");
      return;
    }

    setIsSuggesting(true);
    try {
      const response = await fetch("/api/custom-venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suggestName.trim(),
          city: suggestCity,
          address: suggestAddress.trim(),
          reason: suggestReason.trim(),
          createdBy,
        }),
      });

      const data = (await response.json()) as {
        customVenue?: CustomVenueRecord;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось добавить место.");
      }

      if (data.customVenue) {
        onCustomVenueCreated(data.customVenue);
        // Auto-select the newly created venue
        setSelectedIds((current) => {
          const next = new Set(current);
          next.add(`custom-${data.customVenue!.id}`);
          return next;
        });
      }

      setSuggestName("");
      setSuggestAddress("");
      setSuggestReason("");
      setShowSuggestForm(false);
    } catch (err) {
      setSuggestError(
        err instanceof Error ? err.message : "Не удалось добавить место.",
      );
    } finally {
      setIsSuggesting(false);
    }
  }

  function renderCustomVenueCard(cv: CustomVenueRecord) {
    const cardId = `custom-${cv.id}`;
    const isSelected = selectedIds.has(cardId);
    const isExpanded = expandedId === cardId;

    return (
      <div
        className={`group relative flex flex-col overflow-hidden rounded-[20px] border-2 transition-all ${
          isSelected
            ? "border-emerald-400 bg-emerald-50/30 shadow-md ring-2 ring-emerald-200"
            : "border-amber-200 bg-amber-50/20 hover:border-amber-300 hover:shadow-md"
        }`}
        key={cardId}
      >
        {/* Custom badge */}
        <div className="absolute right-3 top-3 z-10 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-sm">
          Предложено
        </div>

        {isSelected && (
          <div className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-sm">
            ✓
          </div>
        )}

        <button
          className="w-full text-left"
          onClick={() => handleCardTap(cardId)}
          type="button"
        >
          <div className="aspect-[16/9] w-full overflow-hidden">
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500">
              <span className="text-5xl font-bold text-white/80">
                {cv.name[0]}
              </span>
            </div>
          </div>

          <div className="flex items-start justify-between gap-2 p-4 pb-2">
            <h3 className="text-lg font-semibold text-ink">{cv.name}</h3>
            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              {cv.city}
            </span>
          </div>

          <p className="px-4 text-sm text-ink/55 line-clamp-2">
            {cv.reason}
          </p>

          <div className="px-4 pb-2 pt-1">
            <span className="text-xs text-accent/60">
              {isExpanded ? "Свернуть ▲" : "Подробнее ▼"}
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-ink/5 bg-amber-50/30 px-4 py-3 text-sm">
            <div className="grid grid-cols-1 gap-2 text-ink/65">
              <div className="flex items-center gap-2">
                <span className="text-base">📍</span>
                <span>{cv.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🏙</span>
                <span>{cv.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <span>Причина: {cv.reason}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">👤</span>
                <span>Предложил(а): {cv.createdBy}</span>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 pb-4 pt-2">
          <button
            className={`w-full rounded-full py-2.5 text-sm font-semibold transition ${
              isSelected
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-ink/5 text-ink/60 hover:bg-accent hover:text-white"
            }`}
            onClick={() => handleToggle(cardId)}
            type="button"
          >
            {isSelected ? "✓ Выбрано" : "Выбрать"}
          </button>
        </div>

        {/* Venue comments */}
        {renderVenueComments(cardId)}
      </div>
    );
  }

  const placeholderColors = [
    "from-blue-400 to-blue-600",
    "from-emerald-400 to-emerald-600",
    "from-violet-400 to-violet-600",
    "from-pink-400 to-pink-600",
    "from-orange-400 to-orange-600",
    "from-cyan-400 to-cyan-600",
    "from-rose-400 to-rose-600",
    "from-amber-400 to-amber-600",
    "from-teal-400 to-teal-600",
    "from-indigo-400 to-indigo-600",
  ];

  function renderVenueComments(venueId: string) {
    const comments = venueComments.filter((c) => c.venueId === venueId);
    const isPosting = postingCommentId === venueId;

    return (
      <div className="border-t border-ink/5 px-4 pb-4 pt-3">
        {comments.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {comments.slice(0, 5).map((c) => (
              <div className="rounded-lg bg-ink/[0.03] px-3 py-1.5 text-xs" key={c.id}>
                <span className="font-semibold text-ink/70">{c.authorName}:</span>{" "}
                <span className="text-ink/55">{c.text}</span>
              </div>
            ))}
            {comments.length > 5 && (
              <p className="text-[10px] text-ink/30">
                +{comments.length - 5} ещё
              </p>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-lg border border-ink/8 bg-white px-3 py-1.5 text-xs text-ink outline-none transition focus:border-accent"
            maxLength={500}
            onChange={(e) =>
              setCommentText((prev) => ({ ...prev, [venueId]: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handlePostComment(venueId);
              }
            }}
            placeholder="Комментарий..."
            value={commentText[venueId] ?? ""}
          />
          <button
            className="shrink-0 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white disabled:opacity-50"
            disabled={isPosting || !(commentText[venueId]?.trim())}
            onClick={() => void handlePostComment(venueId)}
            type="button"
          >
            {isPosting ? "..." : "Отправить"}
          </button>
        </div>
      </div>
    );
  }

  function renderVenueCard(venue: Venue, index: number) {
    const isSelected = selectedIds.has(venue.id);
    const isExpanded = expandedId === venue.id;
    const imageUrl = imageCache[venue.id];
    const colorClass = placeholderColors[index % placeholderColors.length];

    return (
      <div
        className={`group relative flex flex-col overflow-hidden rounded-[20px] border-2 transition-all ${
          isSelected
            ? "border-emerald-400 bg-emerald-50/30 shadow-md ring-2 ring-emerald-200"
            : "border-ink/8 bg-white hover:border-ink/15 hover:shadow-md"
        }`}
        key={venue.id}
      >
        {/* Recommended badge */}
        {venue.recommended && (
          <div className="absolute right-3 top-3 z-10 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-amber-950 shadow-sm">
            ⭐ Рекомендуем
          </div>
        )}

        {/* Selected check */}
        {isSelected && (
          <div className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-sm">
            ✓
          </div>
        )}

        {/* Tappable area — photo + header */}
        <button
          className="w-full text-left"
          onClick={() => handleCardTap(venue.id)}
          type="button"
        >
          {/* Photo / Placeholder */}
          <div className="aspect-[16/9] w-full overflow-hidden">
            {imageUrl ? (
              <img
                alt={venue.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                src={imageUrl}
              />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${colorClass}`}
              >
                <span className="text-5xl font-bold text-white/80">
                  {venue.name[0]}
                </span>
              </div>
            )}
          </div>

          {/* Card header */}
          <div className="flex items-start justify-between gap-2 p-4 pb-2">
            <h3 className="text-lg font-semibold text-ink">
              {venue.name}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                CATEGORY_COLORS[venue.category]
              }`}
            >
              {venue.category}
            </span>
          </div>

          <p className="px-4 text-sm text-ink/55 line-clamp-1">
            {venue.description}
          </p>

          {/* Expand hint */}
          <div className="px-4 pb-2 pt-1">
            <span className="text-xs text-accent/60">
              {isExpanded ? "Свернуть ▲" : "Подробнее ▼"}
            </span>
          </div>
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="border-t border-ink/5 bg-sky/5 px-4 py-3 text-sm">
            <div className="grid grid-cols-1 gap-2 text-ink/65">
              <div className="flex items-center gap-2">
                <span className="text-base">📍</span>
                <span>{venue.address}</span>
              </div>
              {venue.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-base">📞</span>
                  <span>{venue.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-base">👥</span>
                <span>Вместимость: до {venue.capacity} чел.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">💰</span>
                <span>Средний чек: {venue.avgCheck}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🕐</span>
                <span>Режим работы: {venue.hours}</span>
              </div>
            </div>
          </div>
        )}

        {/* Select button — always visible at bottom */}
        <div className="px-4 pb-4 pt-2">
          <button
            className={`w-full rounded-full py-2.5 text-sm font-semibold transition ${
              isSelected
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-ink/5 text-ink/60 hover:bg-accent hover:text-white"
            }`}
            onClick={() => handleToggle(venue.id)}
            type="button"
          >
            {isSelected ? "✓ Выбрано" : "Выбрать"}
          </button>
        </div>

        {/* Venue comments */}
        {renderVenueComments(venue.id)}
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-sky/50 bg-gradient-to-br from-white/90 via-white/80 to-sky/20 p-5 shadow-card backdrop-blur sm:p-7">
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-ink">
          Где встречаемся? Проголосуй за место!
        </h2>
        <p className="text-sm leading-6 text-ink/55">
          Можно выбрать несколько вариантов. Нажми на карточку, чтобы увидеть
          подробности, и на кнопку «Выбрать» чтобы проголосовать.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-ink/5 bg-sky/15 px-4 py-3">
          <div className="flex flex-wrap gap-2 text-sm text-ink/60">
            <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              Доступно мест:{" "}
              <span className="font-semibold text-ink">{activeVenues.length}</span>
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              Выбрано:{" "}
              <span className="font-semibold text-accent">{selectedIds.size}</span>
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {activeVenues.map((venue, index) => renderVenueCard(venue, index))}
          {customVenues.map((cv) => renderCustomVenueCard(cv))}
        </div>

        {/* Hidden venues - compact collapsible list */}
        {hiddenVenues.length > 0 && (
          <div className="rounded-2xl border border-ink/8 bg-ink/[0.02]">
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setShowHidden(!showHidden)}
              type="button"
            >
              <span className="text-sm font-semibold text-ink/40">
                Скрытые места ({hiddenVenues.length})
              </span>
              <span className="text-xs text-ink/30">
                {showHidden ? "▲" : "▼"}
              </span>
            </button>
            {showHidden && (
              <div className="space-y-2 px-3 pb-3">
                {hiddenVenues.map((venue) => {
                  const voteCount = venueVotes.filter((v) =>
                    v.venueIds.includes(venue.id),
                  ).length;
                  const comments = venueComments.filter(
                    (c) => c.venueId === venue.id,
                  );
                  const isExpanded = expandedId === `hidden-${venue.id}`;

                  return (
                    <div
                      className="rounded-xl border border-ink/5 bg-white/60"
                      key={venue.id}
                    >
                      <button
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                        onClick={() =>
                          setExpandedId(
                            isExpanded ? null : `hidden-${venue.id}`,
                          )
                        }
                        type="button"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-ink/40 line-through">
                            {venue.name}
                          </span>
                          <span className="ml-2 text-[10px] text-ink/25">
                            {venue.category}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {voteCount > 0 && (
                            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink/40">
                              {voteCount} гол.
                            </span>
                          )}
                          {comments.length > 0 && (
                            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink/40">
                              {comments.length} ком.
                            </span>
                          )}
                          <span className="text-[10px] text-ink/25">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-ink/5 px-3 pb-3 pt-2">
                          {/* Venue details */}
                          <div className="mb-2 grid grid-cols-1 gap-1 text-xs text-ink/40">
                            <div>📍 {venue.address}</div>
                            {venue.phone && <div>📞 {venue.phone}</div>}
                            <div>👥 до {venue.capacity} чел.</div>
                            <div>💰 {venue.avgCheck}</div>
                          </div>

                          {/* Comments */}
                          {comments.length > 0 && (
                            <div className="mb-2 space-y-1">
                              {comments.map((c) => (
                                <div
                                  className="rounded-lg bg-ink/[0.03] px-2 py-1 text-xs"
                                  key={c.id}
                                >
                                  <span className="font-semibold text-ink/50">
                                    {c.authorName}:
                                  </span>{" "}
                                  <span className="text-ink/40">{c.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Comment input */}
                          <div className="flex gap-2">
                            <input
                              className="min-w-0 flex-1 rounded-lg border border-ink/8 bg-white px-2 py-1.5 text-xs text-ink outline-none transition focus:border-accent"
                              maxLength={500}
                              onChange={(e) =>
                                setCommentText((prev) => ({
                                  ...prev,
                                  [venue.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  void handlePostComment(venue.id);
                                }
                              }}
                              placeholder="Комментарий..."
                              value={commentText[venue.id] ?? ""}
                            />
                            <button
                              className="shrink-0 rounded-lg bg-accent/10 px-2 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white disabled:opacity-50"
                              disabled={
                                postingCommentId === venue.id ||
                                !(commentText[venue.id]?.trim())
                              }
                              onClick={() => void handlePostComment(venue.id)}
                              type="button"
                            >
                              {postingCommentId === venue.id
                                ? "..."
                                : "Отправить"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Suggest venue section */}
        <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-4">
          {!showSuggestForm ? (
            <button
              className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-100 px-5 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-200"
              onClick={() => setShowSuggestForm(true)}
              type="button"
            >
              + Предложить своё место
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-ink">
                Предложить своё место
              </p>
              <input
                className="w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                maxLength={100}
                onChange={(e) => setSuggestName(e.target.value)}
                placeholder="Название заведения"
                value={suggestName}
              />
              <select
                className="w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                onChange={(e) => setSuggestCity(e.target.value)}
                value={suggestCity}
              >
                <option value="Томск">Томск</option>
                <option value="Северск">Северск</option>
              </select>
              <input
                className="w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                maxLength={200}
                onChange={(e) => setSuggestAddress(e.target.value)}
                placeholder="Адрес (ул. Ленина, 42)"
                value={suggestAddress}
              />
              <textarea
                className="w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                maxLength={500}
                onChange={(e) => setSuggestReason(e.target.value)}
                placeholder="Почему выбираешь это место?"
                rows={2}
                value={suggestReason}
              />

              {suggestError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {suggestError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSuggesting}
                  onClick={() => void handleSuggestVenue()}
                  type="button"
                >
                  {isSuggesting ? "Добавляем..." : "Добавить место"}
                </button>
                <button
                  className="rounded-full border border-ink/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink/60 transition hover:text-ink"
                  onClick={() => {
                    setShowSuggestForm(false);
                    setSuggestError(null);
                  }}
                  type="button"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink" htmlFor="venueFullName">
            Фамилия Имя
          </label>
          <input
            autoComplete="name"
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            id="venueFullName"
            maxLength={100}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Например, Петров Алексей"
            value={fullName}
          />
          <p className="text-xs text-ink/50">
            Только кириллица, пробелы и дефисы. Минимум два слова.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink/55">
            При повторном голосовании предыдущий выбор будет перезаписан.
          </p>
          <button
            className="inline-flex items-center justify-center rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ink hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Сохраняем..." : "Отправить голос за место"}
          </button>
        </div>
      </form>
    </div>
  );
}
