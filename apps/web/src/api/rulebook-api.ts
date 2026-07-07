import type {
  ListRulebooksResponse,
  UploadPdfsResponse,
} from "@/domain/rulebook";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

type UploadRulebookPdfInput = {
  file: File;
  gameName: string;
};

type ApiErrorResponse = {
  error?: string;
};

export async function uploadRulebookPdf({
  file,
  gameName,
}: UploadRulebookPdfInput): Promise<UploadPdfsResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("gameName", gameName);

  const response = await fetch(`${API_BASE_URL}/rulebooks`, {
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

export async function listRulebooks(): Promise<ListRulebooksResponse> {
  const response = await fetch(`${API_BASE_URL}/rulebooks`);

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as
      ApiErrorResponse | undefined;

    throw new Error(errorBody?.error ?? "Failed to load rulebooks");
  }

  return (await response.json()) as ListRulebooksResponse;
}

export async function deleteRulebook(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rulebooks/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as
      ApiErrorResponse | undefined;

    throw new Error(errorBody?.error ?? "Failed to delete rulebook");
  }
}
