export const CONTEXT_ORIGIN = {
  rulebook: "rulebook",
  publicWeb: "public_web",
} as const;

export const CONTEXT_ORIGINS = [
  CONTEXT_ORIGIN.rulebook,
  CONTEXT_ORIGIN.publicWeb,
] as const;

export type ContextOrigin = (typeof CONTEXT_ORIGINS)[number];
