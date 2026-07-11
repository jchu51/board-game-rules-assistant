import { API_BASE_URL } from "./api-config";

type ApiErrorResponse = {
  error?: string;
};

export type RetrievalSearchInput = {
  query: string;
};

export type RetrievalMatchOrigin = "rulebook" | "public_web";

export type RetrievalMatch = {
  origin: RetrievalMatchOrigin;
  content: string;
  metadata: {
    documentId?: string;
    pageNumber?: number;
    source?: string;
  };
};

export type RetrievalSearchResponse = {
  answer: string;
  matches: RetrievalMatch[];
};

export async function searchRulebooks({
  query,
}: RetrievalSearchInput): Promise<RetrievalSearchResponse> {
  const response = await fetch(`${API_BASE_URL}/retrieval/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as
      ApiErrorResponse | undefined;

    throw new Error(errorBody?.error ?? "Failed to search rulebooks");
  }

  return (await response.json()) as RetrievalSearchResponse;
}
