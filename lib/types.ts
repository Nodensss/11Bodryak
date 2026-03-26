export type DateOption = {
  value: string;
  label: string;
  dateKey: string;
  isoDate: string;
  weekday: "fri" | "sat" | "sun";
  weekdayLabel: "Пт" | "Сб" | "Вс";
  timeSlot: "day" | "evening";
  timeLabel: "День" | "Вечер";
  dayNumber: number;
  monthIndex: number;
  monthKey: string;
  monthLabel: string;
  year: number;
};

export type VoteRecord = {
  id: number;
  fullName: string;
  normalizedFullName: string;
  selectedDates: string[];
  createdAt: string;
  updatedAt: string;
};

export type CommentRecord = {
  id: number;
  authorName: string;
  text: string;
  createdAt: string;
};

export type ToastState = {
  message: string;
  tone?: "success" | "error";
};
