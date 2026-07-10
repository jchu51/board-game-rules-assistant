export type PublicSearchDepth = "basic" | "advanced";

export type PublicSearchInput = {
  query: string;
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  searchDepth?: PublicSearchDepth;
};

export type PublicSearchResult = {
  title: string;
  url: string;
  content: string;
  score: number;
  rawContent?: string;
};

export interface PublicSearchService {
  search(input: PublicSearchInput): Promise<PublicSearchResult[]>;
}
