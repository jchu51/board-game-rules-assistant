export type RulebookIndexStatus = "ready" | "processing" | "error";

export type RulebookDocument = {
  id: string;
  gameName: string;
  pdfName: string;
  size: number;
  isPersisted: boolean;
  status: RulebookIndexStatus;
  pages: number | null;
  progress: number;
  file?: File;
};

export type UploadPdfsResponse = {
  id: string;
  gameName: string;
  pdfName: string;
  fileSize: number;
  status: "completed";
  documentCount: number;
  chunkCount: number;
};

export type RulebookSummary = {
  id: string;
  gameName: string;
  pdfName: string;
  fileSize: number;
};

export type ListRulebooksResponse = {
  rulebooks: RulebookSummary[];
};

export const MAX_RULEBOOK_PDF_BYTES = 40 * 1024 * 1024;
