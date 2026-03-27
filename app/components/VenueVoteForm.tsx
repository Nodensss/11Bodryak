"use client";

import { useEffect, useState } from "react";
import { ZodError } from "zod";
import { VENUES, CATEGORY_COLORS } from "@/lib/venues";
import { fullNameSchema } from "@/lib/validation";

type VenueVoteFormProps = {
  initialFullName?: string;
  initialVenueIds?: string[];
  onSubmitted: (vote: { fullName: string; venueIds: string[] }) => void;
};

type VenueImageCache = Record<string, string | null>;

export default function VenueVoteForm({
  initialFullName = "",
  initialVenueIds = [],
  onSubmitted,
}: VenueVoteFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialVenueIds));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageCache, setImageCache] = useState<VenueImageCache>({});

  useEffect(() => {
    setFullName(initialFullName);
    setSelectedIds(new Set(initialVenueIds));
  }, [initialFullName, initialVenueIds]);

  useEffect(() => {
    for (const venue of VENUES) {
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const parsedName = fullNameSchema.parse(fullName);
      const venueIds = [...selectedIds];

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

  return (
    <div className="rounded-[28px] border border-sky/50 bg-gradient-to-br from-white/90 via-white/80 to-sky/20 p-5 shadow-card backdrop-blur sm:p-7">
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-ink">
          Где встречаемся? Проголосуй за место!
        </h2>
        <p className="text-sm leading-6 text-ink/55">
          Можно выбрать несколько вариантов. Нажми на карточку, чтобы
          отметить понравившееся заведение.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-ink/5 bg-sky/15 px-4 py-3">
          <div className="flex flex-wrap gap-2 text-sm text-ink/60">
            <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              Всего мест:{" "}
              <span className="font-semibold text-ink">{VENUES.length}</span>
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              Выбрано:{" "}
              <span className="font-semibold text-accent">{selectedIds.size}</span>
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {VENUES.map((venue, index) => {
            const isSelected = selectedIds.has(venue.id);
            const imageUrl = imageCache[venue.id];
            const colorClass = placeholderColors[index % placeholderColors.length];

            return (
              <button
                className={`group relative flex flex-col overflow-hidden rounded-[20px] border-2 text-left transition-all ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-50/30 shadow-md ring-2 ring-emerald-200"
                    : "border-ink/8 bg-white hover:border-ink/15 hover:shadow-md"
                }`}
                key={venue.id}
                onClick={() => handleToggle(venue.id)}
                type="button"
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

                {/* Card body */}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
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

                  <p className="line-clamp-1 text-sm text-ink/55">
                    {venue.description}
                  </p>

                  <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 pt-2 text-xs text-ink/50">
                    <div>📍 {venue.address}</div>
                    <div>👥 до {venue.capacity} чел.</div>
                    <div>💰 {venue.avgCheck}</div>
                    <div>🕐 {venue.hours}</div>
                  </div>
                </div>
              </button>
            );
          })}
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
