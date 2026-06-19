import { formatCurrency } from "../../../utils/currency";

export const DAY_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export { formatCurrency };
