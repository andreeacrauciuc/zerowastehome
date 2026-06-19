export const BADGE_DEFINITIONS = [
  {
    id: "co2_hero",
    iconId: "globe",
    title: "Eco-hero",
    desc: "Saved 10kg+ CO2",
    isEarned: (metrics) => metrics.co2Saved >= 10,
  },
  {
    id: "chef",
    iconId: "chef-hat",
    title: "Efficient chef",
    desc: "Cooked 5+ recipes from stock",
    isEarned: ({ procurementEfficiencyCount }) => procurementEfficiencyCount >= 5,
  },
  {
    id: "zero_waste",
    iconId: "award",
    title: "Zero waste",
    desc: "95%+ efficiency",
    isEarned: ({ healthScore, eatenCount }) => healthScore >= 95 && eatenCount > 5,
  },
  {
    id: "budget",
    iconId: "wallet",
    title: "Budget saver",
    desc: (formatMoney) => `Saved ${formatMoney(100)}+`,
    isEarned: (metrics) => (metrics.moneySaved ?? metrics.totalSaved ?? 0) >= 100,
  },
];

const defaultFormatMoney = (value) => `${value} RON`;

export const deriveEarnedBadges = (metrics = {}, formatMoney = defaultFormatMoney) =>
  BADGE_DEFINITIONS.filter((badge) => badge.isEarned(metrics)).map(
    ({ id, iconId, title, desc }) => ({
      id,
      iconId,
      title,
      desc: typeof desc === "function" ? desc(formatMoney) : desc,
    }),
  );
