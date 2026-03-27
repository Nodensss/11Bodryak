export type VenueCategory = "Ресторан" | "Кафе" | "Бар" | "Караоке-бар" | "База отдыха";

export type Venue = {
  id: string;
  name: string;
  category: VenueCategory;
  description: string;
  address: string;
  phone: string;
  capacity: number;
  avgCheck: string;
  hours: string;
  recommended: boolean;
};

export const VENUES: Venue[] = [
  {
    id: "venezia",
    name: "Венеция",
    category: "Ресторан",
    description: "Банкетный формат, самый ровный вариант для взрослой встречи",
    address: "ул. Победы, 19/1",
    phone: "+7 (913) 827-60-60",
    capacity: 80,
    avgCheck: "от 500 ₽",
    hours: "12:00–02:00",
    recommended: true,
  },
  {
    id: "rus",
    name: "Русь",
    category: "Ресторан",
    description: "Большой зал, банкеты, шашлык, стейки, плов — без экзотики",
    address: "Северск",
    phone: "",
    capacity: 100,
    avgCheck: "от 400 ₽",
    hours: "уточнять",
    recommended: false,
  },
  {
    id: "samovar",
    name: "Северский самовар",
    category: "Кафе",
    description: "Спокойный формат без пафоса, отдельный банкетный зал",
    address: "ул. Курчатова, 1/1",
    phone: "+7 (913) 706-07-56",
    capacity: 65,
    avgCheck: "~500 ₽",
    hours: "11:00–19:00",
    recommended: true,
  },
  {
    id: "lada",
    name: "Лада",
    category: "Кафе",
    description: "Бюджетный вариант с банкетным залом",
    address: "Северск",
    phone: "",
    capacity: 70,
    avgCheck: "от 300 ₽",
    hours: "с 11:00",
    recommended: false,
  },
  {
    id: "ochag",
    name: "Очаг",
    category: "Кафе",
    description: "Компромисс по цене и формату, банкетный зал",
    address: "Северск",
    phone: "",
    capacity: 60,
    avgCheck: "~300 ₽",
    hours: "уточнять",
    recommended: false,
  },
  {
    id: "olivie",
    name: "Оливье",
    category: "Кафе",
    description: "Спокойное кафе, подойдёт для небольшого сбора",
    address: "Коммунистический просп., 8",
    phone: "+7 (3822) 22-22-80",
    capacity: 50,
    avgCheck: "~400 ₽",
    hours: "09:00–21:00",
    recommended: false,
  },
  {
    id: "picanto",
    name: "Picanto",
    category: "Кафе",
    description: "Неформальная встреча небольшим составом",
    address: "Северск",
    phone: "",
    capacity: 30,
    avgCheck: "от 300 ₽",
    hours: "11:00–23:00 (уточнять)",
    recommended: false,
  },
  {
    id: "rock-grill",
    name: "Рок-Гриль и Пиво",
    category: "Бар",
    description: "Вечерний вайб, живая музыка, банкеты",
    address: "Северск",
    phone: "",
    capacity: 50,
    avgCheck: "от 500 ₽",
    hours: "16:00–04:00",
    recommended: true,
  },
  {
    id: "raspevalnya",
    name: "Распевальня",
    category: "Караоке-бар",
    description: "Продолжение вечера после основного ужина",
    address: "ул. Калинина, 69",
    phone: "+7 (913) 850-07-20",
    capacity: 40,
    avgCheck: "уточнять",
    hours: "18:00–02:00",
    recommended: false,
  },
  {
    id: "extreme-park",
    name: "Экстрим-Парк",
    category: "База отдыха",
    description: "Формат на природе, банкетный зал и площадка",
    address: "Северск",
    phone: "",
    capacity: 40,
    avgCheck: "уточнять",
    hours: "11:00–23:00",
    recommended: false,
  },
];

export const VENUE_MAP = new Map(VENUES.map((v) => [v.id, v]));

export const CATEGORY_COLORS: Record<VenueCategory, string> = {
  "Ресторан": "bg-blue-100 text-blue-700",
  "Кафе": "bg-emerald-100 text-emerald-700",
  "Бар": "bg-violet-100 text-violet-700",
  "Караоке-бар": "bg-pink-100 text-pink-700",
  "База отдыха": "bg-orange-100 text-orange-700",
};

export const CATEGORY_BAR_COLORS: Record<VenueCategory, string> = {
  "Ресторан": "bg-blue-500",
  "Кафе": "bg-emerald-500",
  "Бар": "bg-violet-500",
  "Караоке-бар": "bg-pink-500",
  "База отдыха": "bg-orange-500",
};
