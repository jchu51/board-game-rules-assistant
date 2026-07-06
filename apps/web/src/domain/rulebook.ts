export type RulebookIndexStatus = "ready" | "processing" | "error";

export type RulebookDocument = {
  id: number;
  game: string;
  name: string;
  size: number;
  status: RulebookIndexStatus;
  pages: number | null;
  progress: number;
};

export type SelectedRulebookFile = {
  name: string;
  size: number;
};

export const MAX_RULEBOOK_PDF_BYTES = 40 * 1024 * 1024;

export const SAMPLE_RULEBOOK_DOCUMENTS: RulebookDocument[] = [
  {
    id: 1,
    game: "Gloomhaven",
    name: "gloomhaven-rulebook.pdf",
    size: 18_400_000,
    status: "ready",
    pages: 52,
    progress: 100,
  },
];
