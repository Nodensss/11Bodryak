"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import AdminPanel from "@/app/components/AdminPanel";
import CommentSection from "@/app/components/CommentSection";
import ResultsTable from "@/app/components/ResultsTable";
import Toast from "@/app/components/Toast";
import VoteForm from "@/app/components/VoteForm";
import type { CommentRecord, DateOption, ToastState, VoteRecord } from "@/lib/types";

type ReunionAppProps = {
  dateOptions: DateOption[];
};

type StoredVote = {
  fullName: string;
  selectedDates: string[];
  submittedAt: string;
};

type TabId = "vote" | "results";

const STORAGE_KEY = "class-reunion-11b-vote";

function readStoredVote(): StoredVote | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as StoredVote;

    if (
      typeof parsed.fullName !== "string" ||
      !Array.isArray(parsed.selectedDates) ||
      typeof parsed.submittedAt !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeStoredVote(vote: StoredVote) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vote));
}

function clearStoredVote() {
  window.localStorage.removeItem(STORAGE_KEY);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export default function ReunionApp({ dateOptions }: ReunionAppProps) {
  const [activeTab, setActiveTab] = useState<TabId>("vote");
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [storedVote, setStoredVote] = useState<StoredVote | null>(null);
  const [isEditingVote, setIsEditingVote] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    setStoredVote(readStoredVote());

    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.get("tab") === "results") {
      setActiveTab("results");
    }
  }, []);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);

    if (activeTab === "results") {
      currentUrl.searchParams.set("tab", "results");
    } else {
      currentUrl.searchParams.delete("tab");
    }

    window.history.replaceState({}, "", currentUrl);
  }, [activeTab]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const refreshResults = useCallback(async () => {
    setIsRefreshing(true);
    setResultsError(null);

    try {
      const [votesResponse, commentsResponse] = await Promise.all([
        fetch("/api/votes", {
          cache: "no-store",
        }),
        fetch("/api/comments", {
          cache: "no-store",
        }),
      ]);

      const votesPayload = await parseJsonResponse<{
        votes?: VoteRecord[];
        error?: string;
      }>(votesResponse);
      const commentsPayload = await parseJsonResponse<{
        comments?: CommentRecord[];
        error?: string;
      }>(commentsResponse);

      if (!votesResponse.ok) {
        throw new Error(votesPayload.error ?? "Не удалось загрузить голоса.");
      }

      if (!commentsResponse.ok) {
        throw new Error(
          commentsPayload.error ?? "Не удалось загрузить комментарии.",
        );
      }

      setVotes(votesPayload.votes ?? []);
      setComments(commentsPayload.comments ?? []);
    } catch (error) {
      setResultsError(
        error instanceof Error ? error.message : "Не удалось обновить данные.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "results") {
      void refreshResults();
    }
  }, [activeTab, refreshResults]);

  function handleVoteSubmitted(vote: { fullName: string; selectedDates: string[] }) {
    const persistedVote = {
      ...vote,
      submittedAt: new Date().toISOString(),
    };

    writeStoredVote(persistedVote);
    setStoredVote(persistedVote);
    setIsEditingVote(false);
    setToast({
      message: "Спасибо, твой голос учтён!",
      tone: "success",
    });
    startTransition(() => setActiveTab("results"));
  }

  function handleRevote() {
    setIsEditingVote(true);
    setActiveTab("vote");
  }

  function handleCommentCreated(comment: CommentRecord) {
    setComments((current) => [
      comment,
      ...current.filter((item) => item.id !== comment.id),
    ]);
    setToast({
      message: "Комментарий опубликован.",
      tone: "success",
    });
  }

  function handleAdminReset(scope: "votes" | "comments" | "all") {
    if (scope === "votes" || scope === "all") {
      clearStoredVote();
      setStoredVote(null);
      setIsEditingVote(false);
      setVotes([]);
    }

    if (scope === "comments" || scope === "all") {
      setComments([]);
    }

    setToast({
      message:
        scope === "votes"
          ? "Голоса очищены."
          : scope === "comments"
            ? "Комментарии очищены."
            : "Голоса и комментарии очищены.",
      tone: "success",
    });
    void refreshResults();
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    {
      id: "vote",
      label: "Голосование",
    },
    {
      id: "results",
      label: "Результаты и обсуждение",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="inline-flex w-full flex-col gap-3 rounded-[28px] border border-accent/10 bg-white/70 p-2 backdrop-blur sm:w-auto sm:flex-row">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              className={`rounded-[22px] px-5 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink/70 hover:bg-white hover:text-ink"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "vote" ? (
        storedVote && !isEditingVote ? (
          <div className="rounded-[28px] border border-sky/70 bg-white/80 p-6 shadow-card backdrop-blur sm:p-7">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center rounded-full bg-success px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-successInk">
                Голос уже сохранён
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-ink">
                  Ты уже проголосовал(а)! Можешь посмотреть результаты.
                </h2>
                <p className="text-sm leading-6 text-ink/65">
                  Последний сохранённый голос:{" "}
                  <span className="font-semibold text-ink">
                    {storedVote.fullName}
                  </span>
                  . Если нужно, можно открыть форму и перезаписать выбор.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink"
                  onClick={() => setActiveTab("results")}
                  type="button"
                >
                  Посмотреть результаты
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-full border border-accent/20 bg-white px-6 py-3 text-sm font-semibold text-accent transition hover:border-accent hover:bg-accent hover:text-white"
                  onClick={handleRevote}
                  type="button"
                >
                  Проголосовать заново
                </button>
              </div>
            </div>
          </div>
        ) : (
          <VoteForm
            dateOptions={dateOptions}
            initialFullName={storedVote?.fullName ?? ""}
            initialSelectedDates={storedVote?.selectedDates ?? []}
            onSubmitted={handleVoteSubmitted}
          />
        )
      ) : (
        <div className="space-y-5">
          <ResultsTable
            dateOptions={dateOptions}
            error={resultsError}
            isRefreshing={isRefreshing}
            onRefresh={() => void refreshResults()}
            votes={votes}
          />
          <CommentSection
            comments={comments}
            initialAuthorName={storedVote?.fullName ?? ""}
            onCreated={handleCommentCreated}
          />
          <AdminPanel onReset={handleAdminReset} />
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
