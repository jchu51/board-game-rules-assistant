export type RetrievalSearchInput = {
  query: string;
};

export type RetrievalMatch = {
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
