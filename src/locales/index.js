import en from "./en.json";

const locales = {
  en,
};

const getNestedValue = (obj, path) =>
  String(path || "")
    .split(".")
    .reduce((acc, part) => (acc && Object.prototype.hasOwnProperty.call(acc, part) ? acc[part] : undefined), obj);

export const t = (key, vars = {}, locale = "en") => {
  const template = getNestedValue(locales[locale], key);
  if (typeof template !== "string") return key;

  return template.replace(/\{(\w+)\}/g, (_, token) => {
    const value = vars[token];
    return value === undefined || value === null ? "" : String(value);
  });
};
