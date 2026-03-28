"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import AdminPanel from "@/app/components/AdminPanel";
import CommentSection from "@/app/components/CommentSection";
import ResultsTable from "@/app/components/ResultsTable";
import Toast from "@/app/components/Toast";
import VoteForm from "@/app/components/VoteForm";
import VenueVoteForm from "@/app/components/VenueVoteForm";
import VenueResults from "@/app/components/VenueResults";
import {
  deserializeSelectionsFromStorage,
  sortSelections,
} from "@/lib/dates";
import type {
  CommentRecord,
  CustomVenueRecord,
  DateOption,
  ToastState,
  VenueVoteRecord,
  VoteRecord,
  VoteSelection,
} from "@/lib/types";

type ReunionAppProps = {
  dateOptions: DateOption[];
};

type StoredVote = {
  fullName: string;
  selections: VoteSelection[];
  submittedAt: string;
};

type StoredVenueVote = {
  fullName: string;
  venueIds: string[];
  submittedAt: string;
};

type LegacyStoredVote = {
  fullName: string;
  selectedDates: string[];
  submittedAt: string;
};

type TabId = "vote" | "venue" | "results";

const STORAGE_KEY = "class-reunion-11b-vote";
const VENUE_STORAGE_KEY = "class-reunion-11b-venue-vote";

function isSelectionArray(value: unknown): value is VoteSelection[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as VoteSelection).date === "string" &&
        typeof (item as VoteSelection).day === "string" &&
        Array.isArray((item as VoteSelection).slots) &&
        (item as VoteSelection).slots.every((slot) => typeof slot === "string"),
    )
  );
}

function readStoredVote(): StoredVote | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredVote & LegacyStoredVote>;

    if (
      typeof parsed.fullName !== "string" ||
      typeof parsed.submittedAt !== "string"
    ) {
      return null;
    }

    const selections = isSelectionArray(parsed.selections)
      ? sortSelections(parsed.selections)
      : Array.isArray(parsed.selectedDates) &&
          parsed.selectedDates.every((value) => typeof value === "string")
        ? deserializeSelectionsFromStorage(parsed.selectedDates)
        : null;

    if (!selections || selections.length === 0) {
      return null;
    }

    return {
      fullName: parsed.fullName,
      selections,
      submittedAt: parsed.submittedAt,
    };
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

function readStoredVenueVote(): StoredVenueVote | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(VENUE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredVenueVote>;
    if (
      typeof parsed.fullName !== "string" ||
      !Array.isArray(parsed.venueIds) ||
      typeof parsed.submittedAt !== "string"
    ) {
      return null;
    }
    return parsed as StoredVenueVote;
  } catch {
    return null;
  }
}

function writeStoredVenueVote(vote: StoredVenueVote) {
  window.localStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(vote));
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export default function ReunionApp({ dateOptions }: ReunionAppProps) {
  const [activeTab, setActiveTab] = useState<TabId>("vote");
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [venueVotes, setVenueVotes] = useState<VenueVoteRecord[]>([]);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [storedVote, setStoredVote] = useState<StoredVote | null>(null);
  const [storedVenueVote, setStoredVenueVote] = useState<StoredVenueVote | null>(null);
  const [isEditingVote, setIsEditingVote] = useState(false);
  const [isEditingVenueVote, setIsEditingVenueVote] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [venueImageVersion, setVenueImageVersion] = useState(0);
  const [hiddenVenueIds, setHiddenVenueIds] = useState<Set<string>>(new Set());
  const [customVenues, setCustomVenues] = useState<CustomVenueRecord[]>([]);

  useEffect(() => {
    setStoredVote(readStoredVote());
    setStoredVenueVote(readStoredVenueVote());
    void loadHiddenVenues();
    void loadCustomVenues();

    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get("tab");

    if (tabParam === "results") {
      setActiveTab("results");
    } else if (tabParam === "venue") {
      setActiveTab("venue");
    }
  }, []);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);

    if (activeTab === "results") {
      currentUrl.searchParams.set("tab", "results");
    } else if (activeTab === "venue") {
      currentUrl.searchParams.set("tab", "venue");
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

  async function loadHiddenVenues() {
    try {
      const response = await fetch("/api/hidden-venues", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as { hiddenVenueIds?: string[] };
        setHiddenVenueIds(new Set(data.hiddenVenueIds ?? []));
      }
    } catch {
      // silently ignore
    }
  }

  async function loadCustomVenues() {
    try {
      const response = await fetch("/api/custom-venues", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as { customVenues?: CustomVenueRecord[] };
        setCustomVenues(data.customVenues ?? []);
      }
    } catch {
      // silently ignore
    }
  }

  const refreshResults = useCallback(async () => {
    setIsRefreshing(true);
    setResultsError(null);

    try {
      const [votesResponse, commentsResponse, venueVotesResponse, customVenuesResponse] = await Promise.all([
        fetch("/api/votes", { cache: "no-store" }),
        fetch("/api/comments", { cache: "no-store" }),
        fetch("/api/venue-votes", { cache: "no-store" }),
        fetch("/api/custom-venues", { cache: "no-store" }),
      ]);

      const votesPayload = await parseJsonResponse<{
        votes?: VoteRecord[];
        error?: string;
      }>(votesResponse);
      const commentsPayload = await parseJsonResponse<{
        comments?: CommentRecord[];
        error?: string;
      }>(commentsResponse);
      const venueVotesPayload = await parseJsonResponse<{
        venueVotes?: VenueVoteRecord[];
        error?: string;
      }>(venueVotesResponse);
      const customVenuesPayload = await parseJsonResponse<{
        customVenues?: CustomVenueRecord[];
        error?: string;
      }>(customVenuesResponse);

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
      setVenueVotes(venueVotesPayload.venueVotes ?? []);
      setCustomVenues(customVenuesPayload.customVenues ?? []);
    } catch (error) {
      setResultsError(
        error instanceof Error ? error.message : "Не удалось обновить данные.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "results" || activeTab === "venue") {
      void refreshResults();
    }
  }, [activeTab, refreshResults]);

  function handleVoteSubmitted(vote: {
    fullName: string;
    selections: VoteSelection[];
  }) {
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

  function handleVenueVoteSubmitted(vote: {
    fullName: string;
    venueIds: string[];
  }) {
    const persisted: StoredVenueVote = {
      ...vote,
      submittedAt: new Date().toISOString(),
    };
    writeStoredVenueVote(persisted);
    setStoredVenueVote(persisted);
    setIsEditingVenueVote(false);
    setToast({
      message: "Голос за место сохранён!",
      tone: "success",
    });
    startTransition(() => setActiveTab("results"));
  }

  function handleRevote() {
    setIsEditingVote(true);
    setActiveTab("vote");
  }

  function handleRevenueVote() {
    setIsEditingVenueVote(true);
    setActiveTab("venue");
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

  function handleDeleteVote(voteId: number, fullName: string) {
    setVotes((current) => current.filter((vote) => vote.id !== voteId));

    if (
      storedVote &&
      storedVote.fullName.toLowerCase() === fullName.toLowerCase()
    ) {
      clearStoredVote();
      setStoredVote(null);
      setIsEditingVote(false);
    }

    setToast({
      message: `Голос «${fullName}» удалён.`,
      tone: "success",
    });
  }

  function handleDeleteVenueVote(voteId: number, fullName: string) {
    setVenueVotes((current) => current.filter((vote) => vote.id !== voteId));

    if (
      storedVenueVote &&
      storedVenueVote.fullName.toLowerCase() === fullName.toLowerCase()
    ) {
      window.localStorage.removeItem(VENUE_STORAGE_KEY);
      setStoredVenueVote(null);
      setIsEditingVenueVote(false);
    }

    setToast({
      message: `Голос за место «${fullName}» удалён.`,
      tone: "success",
    });
  }

  function handleVenueImageChanged() {
    setVenueImageVersion((v) => v + 1);
  }

  function handleHiddenVenuesChanged() {
    void loadHiddenVenues();
  }

  function handleCustomVenueCreated(venue: CustomVenueRecord) {
    setCustomVenues((current) => [venue, ...current]);
    setToast({
      message: `Место «${venue.name}» добавлено!`,
      tone: "success",
    });
  }

  function handleDeleteCustomVenue(venueId: number, name: string) {
    setCustomVenues((current) => current.filter((v) => v.id !== venueId));
    setToast({
      message: `Предложенное место «${name}» удалено.`,
      tone: "success",
    });
  }

  const storedFullName = storedVote?.fullName ?? storedVenueVote?.fullName ?? "";

  const tabs: Array<{ id: TabId; label: string }> = [
    {
      id: "vote",
      label: "Голосование",
    },
    {
      id: "venue",
      label: "Выбор места",
    },
    {
      id: "results",
      label: "Результаты",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="inline-flex w-full flex-col gap-1 rounded-full border border-ink/8 bg-white/70 p-1.5 shadow-sm backdrop-blur sm:w-auto sm:flex-row">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-accent text-white shadow-md"
                  : "text-ink/55 hover:bg-ink/5 hover:text-ink"
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
          <div className="rounded-[28px] border border-sky/50 bg-gradient-to-br from-white/90 via-white/80 to-emerald-50/40 p-6 shadow-card backdrop-blur sm:p-8">
            <div className="max-w-2xl space-y-5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm">✓</span>
                <span className="text-sm font-semibold text-emerald-700">
                  Голос за дату сохранён
                </span>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-ink">
                  Ты уже проголосовал(а) за дату!
                </h2>
                <p className="text-sm leading-6 text-ink/55">
                  Сохранён голос от{" "}
                  <span className="font-semibold text-ink">
                    {storedVote.fullName}
                  </span>
                  . Можно посмотреть результаты или переголосовать.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ink hover:shadow-md"
                  onClick={() => setActiveTab("results")}
                  type="button"
                >
                  Посмотреть результаты
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-full border border-ink/10 bg-white px-6 py-3 text-sm font-semibold text-ink/70 shadow-sm transition hover:border-accent hover:text-accent"
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
            initialFullName={storedFullName}
            initialSelections={storedVote?.selections ?? []}
            onSubmitted={handleVoteSubmitted}
          />
        )
      ) : activeTab === "venue" ? (
        storedVenueVote && !isEditingVenueVote ? (
          <div className="rounded-[28px] border border-sky/50 bg-gradient-to-br from-white/90 via-white/80 to-emerald-50/40 p-6 shadow-card backdrop-blur sm:p-8">
            <div className="max-w-2xl space-y-5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm">✓</span>
                <span className="text-sm font-semibold text-emerald-700">
                  Голос за место сохранён
                </span>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-ink">
                  Ты уже проголосовал(а) за место!
                </h2>
                <p className="text-sm leading-6 text-ink/55">
                  Сохранён голос от{" "}
                  <span className="font-semibold text-ink">
                    {storedVenueVote.fullName}
                  </span>
                  {" "}({storedVenueVote.venueIds.length} мест выбрано).
                  Можно посмотреть результаты или переголосовать.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ink hover:shadow-md"
                  onClick={() => setActiveTab("results")}
                  type="button"
                >
                  Посмотреть результаты
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-full border border-ink/10 bg-white px-6 py-3 text-sm font-semibold text-ink/70 shadow-sm transition hover:border-accent hover:text-accent"
                  onClick={handleRevenueVote}
                  type="button"
                >
                  Проголосовать заново
                </button>
              </div>
            </div>
          </div>
        ) : (
          <VenueVoteForm
            key={`venue-form-${venueImageVersion}-${customVenues.length}`}
            initialFullName={storedFullName}
            initialVenueIds={storedVenueVote?.venueIds ?? []}
            hiddenVenueIds={hiddenVenueIds}
            customVenues={customVenues}
            venueVotes={venueVotes}
            onSubmitted={handleVenueVoteSubmitted}
            onCustomVenueCreated={handleCustomVenueCreated}
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
          <VenueResults venueVotes={venueVotes} hiddenVenueIds={hiddenVenueIds} customVenues={customVenues} />
          <CommentSection
            comments={comments}
            initialAuthorName={storedFullName}
            onCreated={handleCommentCreated}
          />
          <AdminPanel
            onReset={handleAdminReset}
            onDeleteVote={handleDeleteVote}
            onDeleteVenueVote={handleDeleteVenueVote}
            onDeleteCustomVenue={handleDeleteCustomVenue}
            onVenueImageChanged={handleVenueImageChanged}
            onHiddenVenuesChanged={handleHiddenVenuesChanged}
            hiddenVenueIds={hiddenVenueIds}
            votes={votes}
            venueVotes={venueVotes}
            customVenues={customVenues}
          />
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
