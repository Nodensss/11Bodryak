"use client";

import { VENUES, VENUE_MAP, CATEGORY_COLORS, CATEGORY_BAR_COLORS } from "@/lib/venues";
import type { VenueVoteRecord } from "@/lib/types";

type VenueResultsProps = {
  venueVotes: VenueVoteRecord[];
};

type VenueScore = {
  venueId: string;
  name: string;
  category: string;
  count: number;
};

export default function VenueResults({ venueVotes }: VenueResultsProps) {
  const voteCounts = new Map<string, number>();

  for (const vote of venueVotes) {
    for (const venueId of vote.venueIds) {
      voteCounts.set(venueId, (voteCounts.get(venueId) ?? 0) + 1);
    }
  }

  const scores: VenueScore[] = VENUES.filter((v) => (voteCounts.get(v.id) ?? 0) > 0)
    .map((v) => ({
      venueId: v.id,
      name: v.name,
      category: v.category,
      count: voteCounts.get(v.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  const maxCount = scores.length > 0 ? scores[0].count : 0;
  const leader = scores.length > 0 ? scores[0] : null;
  const totalVoters = venueVotes.length;

  if (scores.length === 0) {
    return (
      <div className="rounded-[28px] border border-sky/50 bg-gradient-to-br from-white/90 via-white/80 to-sky/15 p-5 shadow-card backdrop-blur sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky/30 text-lg">
            📍
          </div>
          <div>
            <h3 className="text-xl font-semibold text-ink">Голосование за место</h3>
            <div className="mt-3 rounded-2xl border border-dashed border-ink/10 bg-white/50 px-5 py-6 text-center text-sm text-ink/50">
              Пока никто не проголосовал за место. Результаты появятся после первого голоса.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-sky/50 bg-gradient-to-br from-white/90 via-white/80 to-sky/15 p-5 shadow-card backdrop-blur sm:p-7">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky/30 text-lg">
          📍
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-ink">Голосование за место</h3>
          <p className="mt-1 text-sm text-ink/55">
            Проголосовало: {totalVoters} чел.
          </p>

          <div className="mt-5 space-y-3">
            {scores.map((score, index) => {
              const venue = VENUE_MAP.get(score.venueId);
              const isLeader = index === 0;
              const barWidth = maxCount > 0 ? (score.count / maxCount) * 100 : 0;
              const barColor = isLeader
                ? "bg-emerald-500"
                : CATEGORY_BAR_COLORS[venue?.category ?? "Кафе"] ?? "bg-slate-400";

              return (
                <div key={score.venueId} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {score.name}
                    </span>
                    {venue && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          CATEGORY_COLORS[venue.category]
                        }`}
                      >
                        {venue.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-7 flex-1 overflow-hidden rounded-full bg-ink/5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-bold text-ink/70">
                      {score.count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leader card */}
          {leader && (
            <div className="mt-5 overflow-hidden rounded-[20px] border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-green-50/50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-lg">
                  🏆
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/60">
                    Лидер
                  </div>
                  <div className="mt-1 text-xl font-semibold text-emerald-950">
                    {leader.name} — {leader.count} голосов из {totalVoters}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
