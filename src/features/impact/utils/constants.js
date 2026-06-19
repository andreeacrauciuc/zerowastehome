export const SAVED_STATUSES = new Set(["eaten", "saved", "consumed"]);
export const WASTED_STATUSES = new Set(["wasted", "expired", "discarded"]);

export const DATE_FILTERS = [
  { label: "Week", value: "week", days: 7 },
  { label: "Month", value: "month", days: 30 },
  { label: "Total", value: "total", days: null },
];

export const SAVINGS_MODES = [
  {
    label: "All savings",
    value: "all",
    tooltip:
      "Total savings combining both verified purchases and estimated values",
  },
  {
    label: "Verified",
    value: "verified",
    tooltip:
      "Only savings from items you actually bought and added to your fridge via checkout",
  },
  {
    label: "Estimated",
    value: "estimated",
    tooltip:
      "Savings estimated from inventory items without a confirmed purchase price",
  },
];

export const MONTH_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

export const pageMotion = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
};

export const cardMotion = {
  rest: { y: 0, scale: 1 },
  hover: { y: -5, scale: 1.008, transition: { duration: 0.22 } },
};

export const pageMotionReduced = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0 } },
};

export const cardMotionReduced = {
  rest: { y: 0, scale: 1 },
  hover: { y: 0, scale: 1 },
};
