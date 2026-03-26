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
      <div className="rounded-[28px] border border-sky/70 bg-white/80 p-5 shadow-card backdrop-blur sm:p-7">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-ink">
              Результаты и обсуждение
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
              В таблице каждая строка — отдельная дата, а внутри ячеек видно,
              какой человек выбрал пятничный вечер или конкретные слоты в
              субботу и воскресенье.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full border border-accent/20 bg-white px-4 py-2 text-sm font-semibold text-accent transition hover:border-accent hover:bg-accent hover:text-white"
              onClick={handleCopyLink}
              type="button"
            >
              {isLinkCopied ? "Ссылка скопирована" : "Скопировать ссылку"}
            </button>
            <button
              className="inline-flex items-center justify-center rounded-full border border-accent/20 bg-white px-4 py-2 text-sm font-semibold text-accent transition hover:border-accent hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="rounded-2xl border border-dashed border-sky/90 bg-paper px-4 py-5 text-sm text-ink/60">
            Пока ещё нет голосов. Таблица появится после первого сохранённого
            ответа.
          </div>
        ) : (
          <div className="space-y-5">
            {monthGroups.map((month) => (
              <section
                className="rounded-[28px] border border-sky/70 bg-paper/65 p-4 sm:p-5"
                key={month.monthKey}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-ink">
                      {month.monthLabel}
                    </h3>
                    <p className="text-xs uppercase tracking-[0.18em] text-ink/45">
                      {month.year}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/65">
                    {month.rows.length} дат с голосами
                  </span>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-sky/70 bg-white">
                  <table className="min-w-[760px] border-collapse text-sm">
                    <thead className="bg-ink text-white">
                      <tr>
                        <th className="sticky left-0 min-w-[220px] border-b border-white/10 bg-ink px-4 py-3 text-left">
                          Дата
                        </th>
                        {sortedVotes.map((vote) => (
                          <th
                            className="min-w-[148px] border-b border-white/10 px-4 py-3 text-center"
                            key={vote.id}
                          >
                            {vote.fullName}
                          </th>
                        ))}
                        <th className="sticky right-0 min-w-[88px] border-b border-white/10 bg-ink px-4 py-3 text-center">
                          Итого
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {month.rows.map((option) => {
                        const total = rowTotals.get(option.dateKey) ?? 0;
                        const isBestDate = maxVotes > 0 && total === maxVotes;

                        return (
                          <tr
                            className={
                              isBestDate ? "bg-success/80 text-successInk" : "bg-white"
                            }
                            key={option.dateKey}
                          >
                            <td
                              className={`sticky left-0 border-b border-sky/60 px-4 py-3 font-medium ${
                                isBestDate ? "bg-success/90" : "bg-white"
                              }`}
                            >
                              {option.label}
                            </td>

                            {voteSelectionMaps.map((selectionMap, index) => {
                              const selection = selectionMap.get(option.dateKey);

                              return (
                                <td
                                  className="border-b border-sky/60 px-4 py-3 text-center"
                                  key={`${option.dateKey}-${sortedVotes[index]?.id ?? index}`}
                                >
                                  {selection ? (
                                    option.weekday === "fri" ? (
                                      <span
                                        className={`inline-flex rounded-full px-3 py-1 text-base font-semibold ${
                                          bestSlotKeys.has(`${option.dateKey}|evening`)
                                            ? "bg-success text-successInk"
                                            : "bg-sky/25 text-ink"
                                        }`}
                                      >
                                        ✅
                                      </span>
                                    ) : (
                                      <div className="flex flex-wrap justify-center gap-1.5">
                                        {selection.slots.map((slot) => (
                                          <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                              bestSlotKeys.has(`${option.dateKey}|${slot}`)
                                                ? "bg-success text-successInk"
                                                : "bg-sky/25 text-ink/80"
                                            }`}
                                            key={`${option.dateKey}-${sortedVotes[index]?.id ?? index}-${slot}`}
                                          >
                                            {getSlotCompactLabel(slot)}
                                          </span>
                                        ))}
                                      </div>
                                    )
                                  ) : (
                                    ""
                                  )}
                                </td>
                              );
                            })}

                            <td
                              className={`sticky right-0 border-b border-sky/60 px-4 py-3 text-center font-semibold ${
                                isBestDate ? "bg-success/90" : "bg-white"
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

        <div className="mt-5 rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800/70">
            Лучший вариант
          </div>
          <div className="mt-2 text-xl font-semibold leading-snug text-emerald-950 sm:text-2xl">
            {getBestVariantText(
              bestVariantOption,
              bestVariantSlot,
              maxSlotVotes,
              sortedVotes.length,
            )}
          </div>
          <div className="mt-3 text-sm text-emerald-900/75">
            Общее количество проголосовавших:{" "}
            <span className="font-semibold text-emerald-950">{votes.length}</span>
            . Строки с максимальным числом голосов и слоты с максимальным
            пересечением подсвечены зелёным.
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-sky/70 bg-white/80 p-5 shadow-card backdrop-blur sm:p-7">
        <h3 className="text-xl font-semibold text-ink">Список проголосовавших</h3>
        <div className="mt-4 space-y-3">
          {recentVotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sky/90 bg-paper px-4 py-5 text-sm text-ink/60">
              Пока никто не проголосовал.
            </div>
          ) : (
            recentVotes.map((vote) => (
              <div
                className="rounded-2xl border border-sky/60 bg-paper px-4 py-3 text-sm text-ink/80"
                key={vote.id}
              >
                <span className="font-semibold text-ink">{vote.fullName}</span> —{" "}
                {formatDisplayDateTime(vote.updatedAt)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
