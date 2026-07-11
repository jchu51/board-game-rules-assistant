import {
  TavilySearch,
  type TavilySearchAPIRetrieverFields,
  type TavilySearchResponse,
} from "@langchain/tavily";
import type {
  PublicSearchDepth,
  PublicSearchInput,
  PublicSearchResult,
  PublicSearchService,
} from "../../application/public-search/public-search-service";

type TavilyPublicSearchServiceOptions = {
  apiKey: string;
  includeDomains?: string[];
  defaultMaxResults?: number;
  searchDepth?: PublicSearchDepth;
  includeRawContent?: boolean | "markdown" | "text";
  includeUsage?: boolean;
  createTool?: (params: TavilySearchAPIRetrieverFields) => TavilySearchTool;
};

type TavilySearchToolInput = {
  query: string;
  includeDomains?: string[];
  excludeDomains?: string[];
};

type TavilySearchTool = {
  invoke(
    input: TavilySearchToolInput,
  ): Promise<TavilySearchResponse | { error: string }>;
};

const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_SEARCH_DEPTH: PublicSearchDepth = "basic";

const isTavilyErrorResponse = (
  response: TavilySearchResponse | { error: string },
): response is { error: string } =>
  "error" in response && typeof response.error === "string";

export class TavilyPublicSearchService implements PublicSearchService {
  constructor(private readonly options: TavilyPublicSearchServiceOptions) {}

  async search(input: PublicSearchInput): Promise<PublicSearchResult[]> {
    const query = input.query.trim();

    if (!query) {
      return [];
    }

    const tool = this.createTool({
      tavilyApiKey: this.options.apiKey,
      maxResults:
        input.maxResults ??
        this.options.defaultMaxResults ??
        DEFAULT_MAX_RESULTS,
      searchDepth:
        input.searchDepth ?? this.options.searchDepth ?? DEFAULT_SEARCH_DEPTH,
      includeRawContent: this.options.includeRawContent ?? false,
      includeUsage: this.options.includeUsage ?? false,
    });

    const response = await tool.invoke({
      query,
      includeDomains: input.includeDomains ?? this.options.includeDomains,
      excludeDomains: input.excludeDomains,
    });

    if (isTavilyErrorResponse(response)) {
      throw new Error(response.error);
    }

    return this.toPublicSearchResults(response);
  }

  private createTool(params: TavilySearchAPIRetrieverFields): TavilySearchTool {
    return this.options.createTool?.(params) ?? new TavilySearch(params);
  }

  private toPublicSearchResults(
    response: TavilySearchResponse,
  ): PublicSearchResult[] {
    return response.results.map((result) => ({
      title: result.title,
      url: result.url,
      content: result.content,
      score: result.score,
      rawContent: result.raw_content ?? undefined,
    }));
  }
}
