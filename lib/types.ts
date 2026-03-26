export type DateOption = {
  value: string;
  label: string;
  isoDate: string;
  weekday: "fri" | "sat" | "sun";
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
