const CURRENCY_INSTANCES = new Map();
const DEFAULT_CURRENCY = {
  locale: "en-EU",
  currency: "EUR",
};

const getFormatter = (locale = DEFAULT_CURRENCY.locale, currency = DEFAULT_CURRENCY.currency, options = {}) => {
  const key = JSON.stringify({ locale, currency, options });
  if (!CURRENCY_INSTANCES.has(key)) {
    CURRENCY_INSTANCES.set(
      key,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options,
      })
    );
  }
  return CURRENCY_INSTANCES.get(key);
};

export const formatCurrency = (value, config) => {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return getFormatter(
    config?.locale || DEFAULT_CURRENCY.locale,
    config?.currency || DEFAULT_CURRENCY.currency,
    config?.options
  ).format(safeAmount);
};

export const createCurrencyFormatter = (config) =>
  getFormatter(
    config?.locale || DEFAULT_CURRENCY.locale,
    config?.currency || DEFAULT_CURRENCY.currency,
    config?.options
  );

export { DEFAULT_CURRENCY };

