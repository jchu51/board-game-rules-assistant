import type {
  ListRulebooksResponse,
  UploadPdfsResponse,
} from "@/domain/rulebook";

import { ACTOR_HEADERS, API_BASE_URL } from "./api-config";

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
    headers: ACTOR_HEADERS,
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
  const response = await fetch(`${API_BASE_URL}/rulebooks`, { headers: ACTOR_HEADERS });

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
    headers: ACTOR_HEADERS,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as
      ApiErrorResponse | undefined;

    throw new Error(errorBody?.error ?? "Failed to delete rulebook");
  }
}
