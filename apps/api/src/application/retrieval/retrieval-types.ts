import type { Actor } from "@board-game-rules-assistant/database";

export type RetrievalSearchInput = {
  actor?: Actor;
  conversationId: string;
  gameId: string;
  query: string;
};

import type { ContextOrigin } from "@board-game-rules-assistant/agent-core";

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
  answer: string;
  matches: RetrievalMatch[];
};
