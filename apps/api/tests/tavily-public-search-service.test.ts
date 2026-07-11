import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  TavilySearchAPIRetrieverFields,
  TavilySearchResponse,
} from "@langchain/tavily";

import { TavilyPublicSearchService } from "../src/infrastructure/public-search/tavily-public-search-service";

describe("TavilyPublicSearchService", () => {
  it("maps public search input to Tavily and normalizes results", async () => {
    const calls: {
      params: TavilySearchAPIRetrieverFields;
      input: {
        query: string;
        includeDomains?: string[];
        excludeDomains?: string[];
      };
    }[] = [];
    const response: TavilySearchResponse = {
      query: "Catan longest road rule",
      response_time: 0.1,
      results: [
        {
          title: "Longest Road",
          url: "https://www.catan.com/longest-road",
          content: "The longest road special card is worth 2 victory points.",
          score: 0.92,
          raw_content: "Longest Road raw content",
        },
      ],
    };
    const service = new TavilyPublicSearchService({
      apiKey: "test-tavily-key",
      createTool: (params) => ({
        invoke: async (input) => {
          calls.push({ params, input });
          return response;
        },
      }),
      includeRawContent: "text",
      includeUsage: true,
    });

    const results = await service.search({
      query: "  Catan longest road rule  ",
      maxResults: 3,
      searchDepth: "advanced",
      includeDomains: ["catan.com"],
      excludeDomains: ["reddit.com"],
    });

    assert.deepEqual(calls, [
      {
        params: {
          tavilyApiKey: "test-tavily-key",
          maxResults: 3,
          searchDepth: "advanced",
          includeRawContent: "text",
          includeUsage: true,
        },
        input: {
          query: "Catan longest road rule",
          includeDomains: ["catan.com"],
          excludeDomains: ["reddit.com"],
        },
      },
    ]);
    assert.deepEqual(results, [
      {
        title: "Longest Road",
        url: "https://www.catan.com/longest-road",
        content: "The longest road special card is worth 2 victory points.",
        score: 0.92,
        rawContent: "Longest Road raw content",
      },
    ]);
  });

  it("applies the configured include domains when the input has none", async () => {
    const inputs: { includeDomains?: string[] }[] = [];
    const response: TavilySearchResponse = {
      query: "Catan longest road rule",
      response_time: 0.1,
      results: [],
    };
    const service = new TavilyPublicSearchService({
      apiKey: "test-tavily-key",
      includeDomains: ["catan.com", "boardgamegeek.com"],
      createTool: () => ({
        invoke: async (input) => {
          inputs.push(input);
          return response;
        },
      }),
    });

    await service.search({ query: "Catan longest road rule" });
    await service.search({
      query: "Catan longest road rule",
      includeDomains: ["catan.com"],
    });

    assert.deepEqual(inputs[0]?.includeDomains, [
      "catan.com",
      "boardgamegeek.com",
    ]);
    assert.deepEqual(inputs[1]?.includeDomains, ["catan.com"]);
  });

  it("returns no results for blank queries without calling Tavily", async () => {
    const service = new TavilyPublicSearchService({
      apiKey: "test-tavily-key",
      createTool: () => {
        throw new Error("should not create Tavily tool");
      },
    });

    const results = await service.search({ query: "   " });

    assert.deepEqual(results, []);
  });

  it("throws when Tavily returns an error payload", async () => {
    const service = new TavilyPublicSearchService({
      apiKey: "test-tavily-key",
      createTool: () => ({
        invoke: async () => ({ error: "Tavily failed" }),
      }),
    });

    await assert.rejects(
      service.search({ query: "Catan longest road" }),
      /Tavily failed/,
    );
  });
});
