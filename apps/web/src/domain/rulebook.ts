export type RulebookIndexStatus = "ready" | "processing" | "error";

export type RulebookDocument = {
  id: string;
  game: string;
  name: string;
  size: number;
  status: RulebookIndexStatus;
  pages: number | null;
  progress: number;
  file: File;
};

export type UploadPdfsResponse = {
  status: "completed";
  documentCount: number;
  chunkCount: number;
};

export const MAX_RULEBOOK_PDF_BYTES = 40 * 1024 * 1024;
