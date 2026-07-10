export const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const includesTerm = (query: string, term: string) => {
  const escapedTerm = escapeRegExp(term).replaceAll(" ", "\\s+");
  const optionalPlural = term.includes(" ") ? "" : "s?";
  const matcher = new RegExp(`\\b${escapedTerm}${optionalPlural}\\b`);

  return matcher.test(query);
};
