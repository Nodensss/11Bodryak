"use client";

import { useEffect, useState } from "react";
import {
  formatDisplayDateTime,
  getSlotButtonLabel,
  getSlotCompactLabel,
  groupDateOptionsByMonth,
} from "@/lib/dates";
import type { DateOption, VoteRecord, VoteSelection, VoteSlot } from "@/lib/types";

type ResultsTableProps = {
  dateOptions: DateOption[];
  error: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  votes: VoteRecord[];
};

type MonthResultGroup = {
  monthKey: string;
  monthLabel: string;
  rows: DateOption[];
  year: number;
};

function buildSelectionMap(selections: VoteSelection[]) {
  return new Map(selections.map((selection) => [selection.date, selection]));
}

function getBestVariantText(
  option: DateOption | null,
  slot: VoteSlot | null,
  count: number,
  totalVoters: number,
) {
  if (!option || !slot || count === 0) {
    return "Пока нет голосов, чтобы определить лучший вариант.";
  }

  if (option.weekday === "fri") {
    return `${option.label} (${count} из ${totalVoters} человек)`;
  }

  return `${option.label}, ${getSlotButtonLabel(slot)} (${count} из ${totalVoters} человек)`;
}

export default function ResultsTable({
  dateOptions,
  error,
  isRefreshing,
  onRefresh,
  votes,
}: ResultsTableProps) {
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  useEffect(() => {
    if (!isLinkCopied) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsLinkCopied(false);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [isLinkCopied]);

  const sortedVotes = [...votes].sort((left, right) =>
    left.fullName.localeCompare(right.fullName, "ru"),
  );
  const voteSelectionMaps = sortedVotes.map((vote) => buildSelectionMap(vote.selections));
  const recentVotes = [...votes].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
  const rowTotals = new Map<string, number>();
  const slotTotals = new Map<string, number>();

  for (const vote of sortedVotes) {
    for (const selection of vote.selections) {
      rowTotals.set(selection.date, (rowTotals.get(selection.date) ?? 0) + 1);

      for (const slot of selection.slots) {
        const slotKey = `${selection.date}|${slot}`;
        slotTotals.set(slotKey, (slotTotals.get(slotKey) ?? 0) + 1);
      }
    }
  }

  const maxVotes = rowTotals.size > 0 ? Math.max(...rowTotals.values()) : 0;
  const maxSlotVotes = slotTotals.size > 0 ? Math.max(...slotTotals.values()) : 0;
  const bestSlotKeys = new Set(
    [...slotTotals.entries()]
      .filter(([, count]) => count === maxSlotVotes)
      .map(([slotKey]) => slotKey),
  );

  let bestVariantOption: DateOption | null = null;
  let bestVariantSlot: VoteSlot | null = null;

  if (maxSlotVotes > 0) {
    for (const option of dateOptions) {
      const matchingSlot = option.slots.find((slot) =>
        bestSlotKeys.has(`${option.dateKey}|${slot}`),
      );

      if (matchingSlot) {
        bestVariantOption = option;
        bestVariantSlot = matchingSlot;
        break;
      }
    }
  }

  const monthGroups: MonthResultGroup[] = groupDateOptionsByMonth(dateOptions)
    .map((month) => ({
      monthKey: month.monthKey,
      monthLabel: month.monthLabel,
      rows: month.options.filter((option) => (rowTotals.get(option.dateKey) ?? 0) > 0),
      year: month.year,
    }))
    .filter((month) => month.rows.length > 0);

  async function handleCopyLink() {
    const currentUrl = new URL(window.location.href);

    currentUrl.searchParams.set("tab", "results");

    try {
      await navigator.clipboard.writeText(currentUrl.toString());
      setIsLinkCopied(true);
    } catch {
      window.prompt("Скопируй ссылку вручную", currentUrl.toString());
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-sky/50 bg-gradient-to-br from-white/90 via-white/80 to-sky/20 p-5 shadow-card backdrop-blur sm:p-7">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-ink">
              Результаты и обсуждение
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">
              В таблице каждая строка — отдельная дата. Внутри ячеек видно,
              какие слоты выбрал каждый человек.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink/70 shadow-sm transition hover:border-accent hover:text-accent"
              onClick={handleCopyLink}
              type="button"
            >
              {isLinkCopied ? "Скопировано!" : "Скопировать ссылку"}
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink/70 shadow-sm transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isRefreshing}
              onClick={onRefresh}
              type="button"
            >
              {isRefreshing ? "Обновляем..." : "Обновить"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {monthGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/10 bg-white/50 px-5 py-8 text-center text-sm text-ink/50">
            Пока ещё нет голосов. Таблица появится после первого ответа.
          </div>
        ) : (
          <div className="space-y-5">
            {monthGroups.map((month) => (
              <section
                className="overflow-hidden rounded-[24px] border border-ink/5 bg-white/60 shadow-sm"
                key={month.monthKey}
              >
                <div className="flex items-center justify-between gap-3 border-b border-ink/5 bg-gradient-to-r from-sky/30 to-transparent px-5 py-4">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">
                      {month.monthLabel}
                    </h3>
                    <p className="text-xs text-ink/40">
                      {month.year}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-ink/55 shadow-sm">
                    {month.rows.length} дат
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[760px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-ink text-white">
                        <th className="sticky left-0 min-w-[200px] bg-ink px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                          Дата
                        </th>
                        {sortedVotes.map((vote) => (
                          <th
                            className="min-w-[140px] px-4 py-3 text-center text-xs font-semibold"
                            key={vote.id}
                          >
                            {vote.fullName}
                          </th>
                        ))}
                        <th className="sticky right-0 min-w-[80px] bg-ink px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                          Итого
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {month.rows.map((option, rowIndex) => {
                        const total = rowTotals.get(option.dateKey) ?? 0;
                        const isBestDate = maxVotes > 0 && total === maxVotes;

                        return (
                          <tr
                            className={`transition-colors ${
                              isBestDate
                                ? "bg-emerald-50/80 text-emerald-900"
                                : rowIndex % 2 === 0
                                  ? "bg-white"
                                  : "bg-sky/10"
                            } hover:bg-sky/25`}
                            key={option.dateKey}
                          >
                            <td
                              className={`sticky left-0 border-b border-ink/5 px-4 py-3.5 font-medium ${
                                isBestDate ? "bg-emerald-50/90" : rowIndex % 2 === 0 ? "bg-white" : "bg-sky/10"
                              }`}
                            >
                              {option.label}
                            </td>

                            {voteSelectionMaps.map((selectionMap, index) => {
                              const selection = selectionMap.get(option.dateKey);

                              return (
                                <td
                                  className="border-b border-ink/5 px-4 py-3 text-center"
                                  key={`${option.dateKey}-${sortedVotes[index]?.id ?? index}`}
                                >
                                  {selection ? (
                                    option.weekday === "fri" ? (
                                      <span
                                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${
                                          bestSlotKeys.has(`${option.dateKey}|evening`)
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-sky/20 text-accent"
                                        }`}
                                      >
                                        Вечер
                                      </span>
                                    ) : (
                                      <div className="flex flex-wrap justify-center gap-1">
                                        {selection.slots.map((slot) => (
                                          <span
                                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                              bestSlotKeys.has(`${option.dateKey}|${slot}`)
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-sky/20 text-ink/65"
                                            }`}
                                            key={`${option.dateKey}-${sortedVotes[index]?.id ?? index}-${slot}`}
                                          >
                                            {getSlotCompactLabel(slot)}
                                          </span>
                                        ))}
                                      </div>
                                    )
                                  ) : (
                                    <span className="text-ink/15">—</span>
                                  )}
                                </td>
                              );
                            })}

                            <td
                              className={`sticky right-0 border-b border-ink/5 px-4 py-3 text-center font-bold ${
                                isBestDate
                                  ? "bg-emerald-50/90 text-emerald-700"
                                  : rowIndex % 2 === 0
                                    ? "bg-white text-ink/70"
                                    : "bg-sky/10 text-ink/70"
                              }`}
                            >
                              {total}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Best variant card */}
        <div className="mt-5 overflow-hidden rounded-[24px] border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-green-50/50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-lg">
              🏆
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/60">
                Лучший вариант
              </div>
              <div className="mt-1 text-xl font-semibold leading-snug text-emerald-950 sm:text-2xl">
                {getBestVariantText(
                  bestVariantOption,
                  bestVariantSlot,
                  maxSlotVotes,
                  sortedVotes.length,
                )}
              </div>
              <div className="mt-2 text-sm text-emerald-800/65">
                Всего проголосовало:{" "}
                <span className="font-semibold text-emerald-900">{votes.length}</span>
                {votes.length > 0 && ". Лучшие даты и слоты подсвечены зелёным."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voter list card */}
      <div className="rounded-[28px] border border-sky/50 bg-gradient-to-br from-white/90 via-white/80 to-sky/15 p-5 shadow-card backdrop-blur sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky/30 text-lg">
            👥
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-ink">Список проголосовавших</h3>
            <div className="mt-4 space-y-2">
              {recentVotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ink/10 bg-white/50 px-4 py-5 text-center text-sm text-ink/50">
                  Пока никто не проголосовал.
                </div>
              ) : (
                recentVotes.map((vote, index) => (
                  <div
                    className="flex items-center justify-between rounded-2xl border border-ink/5 bg-white/80 px-4 py-3 text-sm shadow-sm transition hover:border-ink/10 hover:shadow"
                    key={vote.id}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <span className="font-semibold text-ink">{vote.fullName}</span>
                    <span className="text-xs text-ink/40">
                      {formatDisplayDateTime(vote.updatedAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
