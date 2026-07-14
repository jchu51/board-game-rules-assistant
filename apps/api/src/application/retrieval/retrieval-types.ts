export type RetrievalSearchInput = {
  conversationId: string;
  query: string;
};

import type { ContextOrigin } from "../../infrastructure/agents/context-origin";

export type RetrievalMatchOrigin = ContextOrigin;

export type RetrievalMatch = {
  origin: RetrievalMatchOrigin;
  content: string;
  metadata: {
    documentId?: string;
    pageNumber?: number;
    source?: string;
  };
};

export type RetrievalSearchResult = {
  title: string;
  answer: string;
  matches: RetrievalMatch[];
};

export type RetrievalAnswerResult = Omit<RetrievalSearchResult, "title">;
