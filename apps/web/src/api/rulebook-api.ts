import type { UploadPdfsResponse } from "@/domain/rulebook";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

type UploadRulebookPdfInput = {
  file: File;
};

type ApiErrorResponse = {
  error?: string;
};

export async function uploadRulebookPdf({
  file,
}: UploadRulebookPdfInput): Promise<UploadPdfsResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload-pdfs`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as
      ApiErrorResponse | undefined;

    throw new Error(errorBody?.error ?? "Failed to upload rulebook PDF");
  }

  return (await response.json()) as UploadPdfsResponse;
}
