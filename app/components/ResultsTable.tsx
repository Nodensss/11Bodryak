"use client";

import type { DateOption, VoteRecord } from "@/lib/types";
import { formatDisplayDateTime } from "@/lib/dates";

type ResultsTableProps = {
  dateOptions: DateOption[];
  error: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  votes: VoteRecord[];
};

export default function ResultsTable({
  dateOptions,
  error,
  isRefreshing,
  onRefresh,
  votes,
}: ResultsTableProps) {
  const sortedVotes = [...votes].sort((left, right) =>
    left.fullName.localeCompare(right.fullName, "ru"),
  );
  const voteCounts = dateOptions.map(
    (option) =>
      sortedVotes.filter((vote) => vote.selectedDates.includes(option.value)).length,
  );
  const maxVotes = voteCounts.length > 0 ? Math.max(...voteCounts) : 0;
  const recentVotes = [...votes].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-sky/70 bg-white/80 p-5 shadow-card backdrop-blur sm:p-7">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-ink">
              Результаты и обсуждение
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Таблица обновляется при каждом открытии вкладки и по кнопке
              ниже.
            </p>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-full border border-accent/20 bg-white px-4 py-2 text-sm font-semibold text-accent transition hover:border-accent hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRefreshing}
            onClick={onRefresh}
            type="button"
          >
            {isRefreshing ? "Обновляем..." : "Обновить"}
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-sky/70 bg-paper">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] border-collapse text-sm">
              <thead className="bg-ink text-white">
                <tr>
                  <th className="sticky left-0 min-w-[230px] border-b border-white/10 bg-ink px-4 py-3 text-left">
                    Дата
                  </th>
                  {sortedVotes.map((vote) => (
                    <th
                      className="min-w-[140px] border-b border-white/10 px-4 py-3 text-center"
                      key={vote.id}
                    >
                      {vote.fullName}
                    </th>
                  ))}
                  <th className="sticky right-0 min-w-[96px] border-b border-white/10 bg-ink px-4 py-3 text-center">
                    Итого
                  </th>
                </tr>
              </thead>

              <tbody>
                {dateOptions.map((option, index) => {
                  const total = voteCounts[index];
                  const isBest = maxVotes > 0 && total === maxVotes;

                  return (
                    <tr
                      className={isBest ? "bg-success/80 text-successInk" : "bg-white"}
                      key={option.value}
                    >
                      <td
                        className={`sticky left-0 border-b border-sky/60 px-4 py-3 font-medium ${
                          isBest ? "bg-success/90" : "bg-white"
                        }`}
                      >
                        {option.label}
                      </td>
                      {sortedVotes.map((vote) => (
                        <td
                          className="border-b border-sky/60 px-4 py-3 text-center text-lg"
                          key={`${option.value}-${vote.id}`}
                        >
                          {vote.selectedDates.includes(option.value) ? "✅" : ""}
                        </td>
                      ))}
                      <td
                        className={`sticky right-0 border-b border-sky/60 px-4 py-3 text-center font-semibold ${
                          isBest ? "bg-success/90" : "bg-white"
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
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-sky/35 px-4 py-4 text-sm text-ink/75 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Общее количество проголосовавших:{" "}
            <span className="font-semibold text-ink">{votes.length}</span>
          </span>
          <span>
            Лучшие даты подсвечены зелёным. Максимум голосов:{" "}
            <span className="font-semibold text-ink">{maxVotes}</span>
          </span>
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
