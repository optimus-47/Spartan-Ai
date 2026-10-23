export type FeatureId =
  | "injury"
  | "photo"
  | "diary"
  | "planner"
  | "pr"
  | "trends";

export interface Feature {
  id: FeatureId;
  numeral: string;
  title: string;
  lines: [string, string];
  bullets: [string, string, string];
  how: string;
}

export const FEATURES: readonly Feature[] = [
  {
    id: "injury",
    numeral: "01",
    title: "Injury-aware workouts",
    lines: [
      "Tell it what hurts and what equipment you have.",
      "Unsafe movements are removed before the AI arranges anything.",
    ],
    bullets: [
      "Your injuries and available equipment narrow the exercise pool in code.",
      "The AI only arranges sets, reps and order from what is left.",
      "The finished plan is validated against the same rules before you see it.",
    ],
    how: "FILTER IN CODE → AI ARRANGES → VALIDATE OUTPUT",
  },
  {
    id: "photo",
    numeral: "02",
    title: "Photo meal logging",
    lines: [
      "Photograph a plate and review what was detected.",
      "Every item carries a confidence score you can correct.",
    ],
    bullets: [
      "Detections arrive with a confidence score, not a silent guess.",
      "Portions are editable in grams before anything is written down.",
      "Photos are processed in memory to detect food and are not kept.",
    ],
    how: "DETECT → REVIEW CONFIDENCE → CONFIRM BEFORE LOG",
  },
  {
    id: "diary",
    numeral: "03",
    title: "One diary",
    lines: [
      "Typed search from the food catalog and photo logging agree.",
      "Both land in the same day, with the same totals.",
    ],
    bullets: [
      "Search the catalog, enter an amount, and it joins the same diary.",
      "Photo entries and typed entries share one running total.",
      "Macros and calories update as entries are confirmed.",
    ],
    how: "TYPED SEARCH + PHOTO → ONE DAY TOTAL",
  },
  {
    id: "planner",
    numeral: "04",
    title: "AI meal plans",
    lines: [
      "Pick a diet type and get a plan written around it.",
      "Vegetarian, vegan, non-vegetarian and eggetarian are supported.",
    ],
    bullets: [
      "Plans are generated per diet type, not filtered afterwards.",
      "Each day is laid out meal by meal so you can shop against it.",
      "Anything you actually eat still goes through the same diary.",
    ],
    how: "DIET TYPE → AI PLAN → YOUR DIARY",
  },
  {
    id: "pr",
    numeral: "05",
    title: "PR detection",
    lines: [
      "Sets are measured against your estimated one-rep max.",
      "A personal record is flagged the moment the maths says so.",
    ],
    bullets: [
      "An estimated one-rep max is derived from the weight and reps you log.",
      "A set that beats the previous estimate is marked as a record.",
      "No manual bookkeeping and no guessing at what counted.",
    ],
    how: "LOG SET → ESTIMATE 1RM → COMPARE",
  },
  {
    id: "trends",
    numeral: "06",
    title: "Progress you can read",
    lines: [
      "Weight and calorie history drawn as plain trend charts.",
      "Enough to see direction without reading rows of numbers.",
    ],
    bullets: [
      "Body weight over time, plotted from your own entries.",
      "Calorie history from the same diary that photo and search feed.",
      "Charts stay legible in both the light and dark themes.",
    ],
    how: "YOUR ENTRIES → WEIGHT AND CALORIE TRENDS",
  },
] as const;

export interface PoolExercise {
  name: string;
  detail: string;
  conflicts: readonly InjuryId[];
}

export type InjuryId = "shoulder" | "knee" | "lower-back";

export const INJURIES: readonly { id: InjuryId; label: string }[] = [
  { id: "shoulder", label: "Shoulder" },
  { id: "knee", label: "Knee" },
  { id: "lower-back", label: "Lower back" },
];

export const EXERCISE_POOL: readonly PoolExercise[] = [
  { name: "Overhead press", detail: "4 × 6", conflicts: ["shoulder"] },
  { name: "Barbell back squat", detail: "4 × 5", conflicts: ["knee", "lower-back"] },
  { name: "Conventional deadlift", detail: "3 × 5", conflicts: ["lower-back"] },
  { name: "Dumbbell bench press", detail: "4 × 8", conflicts: ["shoulder"] },
  { name: "Leg press", detail: "3 × 10", conflicts: ["knee"] },
  { name: "Chest-supported row", detail: "4 × 10", conflicts: [] },
  { name: "Seated hamstring curl", detail: "3 × 12", conflicts: [] },
  { name: "Cable triceps press", detail: "3 × 12", conflicts: [] },
];

export interface DetectedFood {
  name: string;
  grams: number;
  confidence: number;
}

export const DETECTED_FOODS: readonly DetectedFood[] = [
  { name: "Dal", grams: 180, confidence: 88 },
  { name: "Rice", grams: 210, confidence: 62 },
  { name: "Salad", grams: 90, confidence: 41 },
];

export interface DiaryEntry {
  name: string;
  source: "search" | "photo";
  kcal: number;
}

export const DIARY_ENTRIES: readonly DiaryEntry[] = [
  { name: "Oats, 60 g", source: "search", kcal: 228 },
  { name: "Dal and rice plate", source: "photo", kcal: 486 },
  { name: "Paneer, 120 g", source: "search", kcal: 312 },
  { name: "Banana", source: "photo", kcal: 105 },
];

export const DIARY_MACROS: readonly { label: string; grams: number; pct: number }[] =
  [
    { label: "PROTEIN", grams: 118, pct: 74 },
    { label: "CARBS", grams: 196, pct: 58 },
    { label: "FAT", grams: 54, pct: 46 },
  ];

export const DIARY_TOTAL_KCAL = 1131;

export type DietId = "vegetarian" | "vegan" | "non-veg" | "eggetarian";

export const DIETS: readonly { id: DietId; label: string }[] = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "non-veg", label: "Non-veg" },
  { id: "eggetarian", label: "Eggetarian" },
];

export const MEAL_PLAN: Record<DietId, readonly (readonly string[])[]> = {
  vegetarian: [
    ["Curd and oats", "Rajma with rice", "Paneer and roti"],
    ["Poha with peanuts", "Chole and rice", "Palak paneer"],
    ["Idli with sambar", "Dal and jeera rice", "Tofu bhurji"],
  ],
  vegan: [
    ["Oats with soy milk", "Rajma with rice", "Tofu and roti"],
    ["Poha with peanuts", "Chole and rice", "Soya chunk curry"],
    ["Idli with sambar", "Dal and jeera rice", "Tempeh stir fry"],
  ],
  "non-veg": [
    ["Oats and boiled eggs", "Chicken with rice", "Grilled fish and salad"],
    ["Omelette and toast", "Chicken curry and roti", "Prawn stir fry"],
    ["Chicken sandwich", "Fish curry and rice", "Mutton keema and roti"],
  ],
  eggetarian: [
    ["Oats and boiled eggs", "Rajma with rice", "Egg curry and roti"],
    ["Omelette and toast", "Chole and rice", "Egg bhurji and roti"],
    ["Egg sandwich", "Dal and jeera rice", "Shakshuka"],
  ],
};

export interface LoggedSet {
  set: number;
  weight: number;
  reps: number;
}

export const PR_SETS: readonly LoggedSet[] = [
  { set: 1, weight: 90, reps: 5 },
  { set: 2, weight: 100, reps: 4 },
  { set: 3, weight: 105, reps: 4 },
];

export const PR_ESTIMATED_1RM = 114.8;
export const PR_PREVIOUS_1RM = 109.3;

export const WEIGHT_SERIES: readonly number[] = [
  82.4, 82.1, 81.8, 81.9, 81.3, 80.9, 80.6, 80.7, 80.1, 79.8, 79.5, 79.2,
];

export const WEIGHT_MONTHS: readonly string[] = ["JAN", "APR", "JUL", "OCT"];

export const HERO_SESSION: readonly { name: string; scheme: string; rpe: string }[] =
  [
    { name: "Chest-supported row", scheme: "4 × 10", rpe: "RPE 7" },
    { name: "Incline dumbbell press", scheme: "4 × 8", rpe: "RPE 8" },
    { name: "Leg press", scheme: "3 × 12", rpe: "RPE 7" },
    { name: "Cable triceps press", scheme: "3 × 12", rpe: "RPE 8" },
  ];

export const MARQUEE_ITEMS: readonly string[] = [
  "INJURY-AWARE PLANS",
  "PHOTO MEAL LOGGING",
  "CONFIRM BEFORE LOG",
  "EQUIPMENT FILTERS",
  "ESTIMATED 1RM",
  "AI MEAL PLANS",
  "ONE DIARY",
  "TREND CHARTS",
];

export interface ExplodedPlate {
  numeral: string;
  title: string;
  caption: string;
  ai?: boolean;
}

export const EXPLODED_PLATES: readonly ExplodedPlate[] = [
  {
    numeral: "1",
    title: "Your injuries and equipment",
    caption:
      "You record what hurts and what you can actually train with. This is the input, and nothing downstream is allowed to ignore it.",
  },
  {
    numeral: "2",
    title: "Safe exercise pool",
    caption:
      "Code removes every movement that conflicts with your injuries or needs equipment you do not have.",
  },
  {
    numeral: "3",
    title: "AI arranges the plan",
    caption:
      "The model works only inside the remaining pool, choosing order, sets and reps for the session.",
    ai: true,
  },
  {
    numeral: "4",
    title: "Output validated",
    caption:
      "The finished plan is checked against the same rules again, so a stray suggestion cannot reach you.",
  },
  {
    numeral: "5",
    title: "Your plan",
    caption:
      "What arrives is a session you can run, built from movements that were safe before the AI ever saw them.",
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: "Does it ever suggest exercises that conflict with my injuries?",
    answer:
      "Exercises are filtered by your injuries and equipment in code before the AI arranges the plan, and the result is checked again afterwards.",
  },
  {
    question: "Are my meal photos stored?",
    answer:
      "Photos are processed in memory to detect food and are not kept.",
  },
  {
    question: "How accurate is photo logging?",
    answer:
      "Portions from one photo are estimates, so every detection shows a confidence score, you can edit the grams, and nothing is logged until you confirm.",
  },
  {
    question: "Can I log without photos?",
    answer:
      "Yes. Search the food catalog and enter an amount; it lands in the same diary.",
  },
  {
    question: "Do I need to verify my email?",
    answer: "Yes, a verification link is sent when you sign up.",
  },
];

export const SECTIONS: readonly { id: string; label: string }[] = [
  { id: "collection", label: "Collection" },
  { id: "how-it-works", label: "How it works" },
  { id: "faq", label: "FAQ" },
];
