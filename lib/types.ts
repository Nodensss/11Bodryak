export type VoteDay = "fri" | "sat" | "sun";

export type VoteSlot = "evening" | "12-15" | "15-18" | "18-21";

export type VoteSelection = {
  date: string;
  day: VoteDay;
  slots: VoteSlot[];
};

export type DateOption = {
  dateKey: string;
  isoDate: string;
  label: string;
  weekday: VoteDay;
  weekdayLabel: "Пт" | "Сб" | "Вс";
  dayNumber: number;
  monthIndex: number;
  monthKey: string;
  monthLabel: string;
  slots: VoteSlot[];
  year: number;
};

export type VoteRecord = {
  id: number;
  fullName: string;
  normalizedFullName: string;
  selections: VoteSelection[];
  createdAt: string;
  updatedAt: string;
};

export type CommentRecord = {
  id: number;
  authorName: string;
  text: string;
  createdAt: string;
};

export type VenueVoteRecord = {
  id: number;
  fullName: string;
  normalizedFullName: string;
  venueIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CustomVenueRecord = {
  id: number;
  name: string;
  city: string;
  address: string;
  reason: string;
  createdBy: string;
  createdAt: string;
};

export type ToastState = {
  message: string;
  tone?: "success" | "error";
};
