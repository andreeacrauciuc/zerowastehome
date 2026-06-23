const NON_FOOD_KEYWORDS = [
  "total",
  "subtotal",
  "tva",
  "tax",
  "cash",
  "card",
  "change",
  "balance",
  "receipt",
  "bon",
  "thank",
  "thank you",
  "tel",
  "phone",
  "www",
  "http",
  "str",
  "street",
  "date",
  "time",
  "operator",
  "cui",
  "fiscal",
  "plata",
  "payment",
  "discount",
  "promo",
  "promotie",
  "reducere",
  "savings",
  "qty",
  "item",
];

const FOOD_KEYWORDS = [
  "apple", "banana", "orange", "tomato", "potato", "onion", "garlic", "carrot", "cucumber",
  "milk", "yogurt", "cheese", "butter", "egg", "bread", "flour", "rice", "pasta",
  "chicken", "beef", "pork", "fish", "ham", "sausage", "iaurt", "branza", "lapte",
  "ou", "paine", "orez", "paste", "carne", "pui", "mere", "banane", "rosii", "cartofi",
  "ceapa", "ardei", "castraveti", "broccoli", "ciuperci", "portocale", "struguri", "pepene",
  "zahar", "faina", "smantana", "unt", "salam", "carnati", "somon", "ton", "ulei", "ketchup",
  "biscuiti", "cafea", "ceai"
];

const NON_FOOD_PRODUCT_WORDS = [
  "detergent", "balsam", "sampon", "shampoo", "sapun", "soap", "deodorant", "toothpaste",
  "hartie", "servetele", "clor", "inalbitor", "odorizant", "baterii", "jucarie", "cosmetic",
  "crema", "lotiune", "scutece", "pet"
];

const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const parsePrice = (raw) => {
  const compact = String(raw || "").replace(/\s/g, "");
  let normalized = compact;

  const hasComma = compact.includes(",");
  const hasDot = compact.includes("");

  if (hasComma && hasDot) {
    normalized =
      compact.lastIndexOf(",") > compact.lastIndexOf("")
        ? compact.replace(/\./g, "").replace(",", "")
        : compact.replace(/,/g, "");
  } else if (hasComma) {
    normalized = compact.replace(/\./g, "").replace(",", "");
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
};

const hasFoodKeyword = (text) => {
  const lower = normalize(text);
  return FOOD_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const isClearlyNonFood = (text) => {
  const lower = normalize(text);
  return NON_FOOD_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const containsNonFoodProductWord = (text) => {
  const lower = normalize(text);
  return NON_FOOD_PRODUCT_WORDS.some((keyword) => lower.includes(keyword));
};

const hasMeasurementHint = (text) => /\b(kg|g|gr|l|ml|buc|pcs|x)\b/i.test(text);

const findLastPriceToken = (line) => {
  const pricePattern = /\d{1,4}(?:[.,]\d{3})*[.,]\d{2}/g;
  const matches = [...line.matchAll(pricePattern)];
  if (!matches.length) return null;

  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const token = matches[i][0];
    const value = parsePrice(token);
    if (value === null) continue;
    if (value > 0 && value < 10000) {
      return { token, index: matches[i].index, value };
    }
  }

  return null;
};

const cleanNamePart = (lineWithoutPrice) => {
  return lineWithoutPrice
    .replace(/^\s*[A-Z]?\d{2,}\s+/i, "")
    .replace(/\b\d+\s*[x*]\s*/gi, "")
    .replace(/\b\d+[.,]\d+\s*(kg|g|l|ml|buc|pcs)?\b/gi, "")
    .replace(/^\s*\d+([.,]\d+)?\s*[x*]?\s*/i, "")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/[^a-zA-Z\s'-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const isLikelyProductName = (name) => {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 8) return false;

  const alphaChars = (name.match(/[a-zA-Z]/g) || []).length;
  if (alphaChars < 3) return false;

  const digitChars = (name.match(/\d/g) || []).length;
  if (digitChars > alphaChars) return false;

  return true;
};

const getFoodConfidenceScore = ({ rawLine, name }) => {
  let score = 0;
  if (hasFoodKeyword(name)) score += 3;
  if (hasMeasurementHint(rawLine)) score += 1;
  if (name.split(/\s+/).filter(Boolean).length <= 4) score += 1;
  if (containsNonFoodProductWord(name)) score -= 4;
  if (isClearlyNonFood(rawLine)) score -= 5;
  return score;
};

export const extractFoodItemsFromScanText = (rawText) => {
  if (!rawText) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const unique = new Set();
  const extracted = [];

  lines.forEach((line) => {
    if (line.length < 4 || line.length > 80) return;
    if (isClearlyNonFood(line)) return;

    const priceMatch = findLastPriceToken(line);
    if (!priceMatch) return;

    const namePart = line.slice(0, priceMatch.index).trim();
    const name = cleanNamePart(namePart);
    if (!name || !isLikelyProductName(name)) return;

    const score = getFoodConfidenceScore({ rawLine: line, name });
    if (score < 2) return;

    const price = parsePrice(priceMatch.token);
    if (price === null || !(price > 0 && price < 10000)) return;

    const dedupeKey = `${name.toLowerCase()}|${price.toFixed(2)}`;
    if (unique.has(dedupeKey)) return;

    unique.add(dedupeKey);
    extracted.push({ name, price });
  });

  return extracted;
};
