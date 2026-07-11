# Phase 01 Tavily Public Search — Retrieval Low-Level Design

|                  |                                   |
| ---------------- | --------------------------------- |
| **Status**       | `IMPLEMENTED`                     |
| **Date**         | 2026-07-11                        |
| **Last Updated** | 2026-07-11                        |
| **Context**      | Phase 01 retrieval decision layer |

## Overview

Phase 01 extends the indexed-rulebook retrieval flow with a bounded Tavily
fallback. The API classifies the request, searches the internal vector store,
and then chooses one of four outcomes: reject an unsupported request, answer
from strong rulebook context, ask the user to clarify weak context, or search
public sources when the internal store returns no candidates.

The public-search branch reuses the same context-filtering and answer agents as
the rulebook branch. Every returned match is labeled with its origin so prompts
and API consumers can distinguish uploaded rulebook evidence from public-web
evidence.

## Retrieval Decision Flow

![Phase 01 retrieval decision flow](./diagrams/phase-01-retrieval-decision-flow.png)

[PlantUML source](./diagrams/phase-01-retrieval-decision-flow.puml)

## Decision Algorithm

`RetrievalService.search()` applies the following rules in order:

1. `RequestClassifierService` trims and classifies the query.
2. An out-of-scope query returns guidance and does not call the vector store,
   Tavily, or either agent.
3. An in-scope query searches the vector store with `topK = 5`.
4. Results scoring above `0.65` become `rulebook` matches. The context agent
   filters them and the answer agent generates the response.
5. If vector candidates exist but none score above `0.65`, the API returns a
   clarification request. It does not call Tavily because the weak matches
   indicate that the question may relate to indexed material but lacks enough
   specificity.
6. If the vector store returns no candidates, the API calls Tavily with the
   normalized query.
7. Tavily results become `public_web` matches containing the result content and
   source URL. They pass through the context and answer agents.
8. A Tavily exception or an empty Tavily response returns a not-enough-information
   answer with no matches.

The relevance comparison is strictly `score > 0.65`; a score equal to `0.65`
is treated as weak.

## Component Responsibilities

| Component                   | Responsibility                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `RequestClassifierService`  | Normalizes the query and rejects clearly unrelated requests using known-game, rule-term, and question heuristics.          |
| `RetrievalService`          | Owns branch ordering, the vector relevance threshold, clarification behavior, context formatting, and safe-stop responses. |
| `VectorStore`               | Returns the top five indexed rulebook documents with similarity scores.                                                    |
| `PublicSearchService`       | Defines the provider-neutral public-search input and normalized result contract.                                           |
| `TavilyPublicSearchService` | Invokes Tavily, applies configured domain restrictions, and maps provider results into the application contract.           |
| `RuleContextAgent`          | Removes irrelevant retrieved text while retaining origin and source labels.                                                |
| `RuleAnswerAgent`           | Generates the final answer from the filtered context.                                                                      |

## Branch Contract

| Condition                                                     | Tavily called | Agents called | Match origin | Response behavior                                                      |
| ------------------------------------------------------------- | ------------- | ------------- | ------------ | ---------------------------------------------------------------------- |
| Request is out of scope                                       | No            | No            | None         | Explain supported board-game question scope.                           |
| At least one vector score is `> 0.65`                         | No            | Yes           | `rulebook`   | Answer using strong indexed context.                                   |
| Vector candidates exist, all scores are `<= 0.65`             | No            | No            | None         | Ask for the game and a more specific rule, action, card, or situation. |
| Vector search returns no candidates; Tavily returns results   | Yes           | Yes           | `public_web` | Answer using filtered public-web context and return source URLs.       |
| Vector search returns no candidates; Tavily fails or is empty | Yes           | No            | None         | Return not enough information.                                         |

## Data Mapping

### Vector result to retrieval match

| Source                    | Target                | Notes                                 |
| ------------------------- | --------------------- | ------------------------------------- |
| `document.pageContent`    | `match.content`       | Text passed to the context agent.     |
| constant                  | `match.origin`        | `rulebook`.                           |
| `metadata.documentId`     | `metadata.documentId` | Optional indexed document identifier. |
| `metadata.loc.pageNumber` | `metadata.pageNumber` | Optional PDF page number.             |
| `metadata.source`         | `metadata.source`     | Usually the uploaded PDF source.      |

### Tavily result to retrieval match

| Source           | Target            | Notes                                                                                 |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------- |
| `result.content` | `match.content`   | Search-result content passed to the context agent.                                    |
| constant         | `match.origin`    | `public_web`.                                                                         |
| `result.url`     | `metadata.source` | Returned to the client and included in agent context.                                 |
| `result.score`   | Not mapped        | Available in the provider contract but not currently used as a reliability threshold. |
| `result.title`   | Not mapped        | Available in the provider contract but not currently returned as match metadata.      |

## Configuration

| Variable                        | Required | Behavior                                                                                                  |
| ------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `TAVILY_API_KEY`                | Yes      | Starts the Tavily client. API configuration validation fails when missing or empty.                       |
| `PUBLIC_SEARCH_INCLUDE_DOMAINS` | No       | Comma-separated domains passed as Tavily `includeDomains`. Empty input leaves public search unrestricted. |

Recommended local configuration:

```dotenv
TAVILY_API_KEY=your_api_key
PUBLIC_SEARCH_INCLUDE_DOMAINS=catan.com,boardgamegeek.com
```

## Error Handling

- Blank public-search queries return no results without calling Tavily.
- Tavily error payloads are converted to exceptions by the adapter.
- `RetrievalService` catches public-search exceptions, logs the failure, and
  returns the same safe response used for zero public results.
- Weak vector candidates are not exposed as evidence and do not trigger agents.
- Agent failures continue to propagate as agent errors; Phase 01 does not add
  retry or circuit-breaker behavior.

## Testing Notes

Focused unit coverage verifies:

- empty internal and public results return not enough information;
- weak vector candidates return clarification and skip Tavily and agents;
- strong vector matches use the agent path;
- out-of-scope questions skip all retrieval;
- public results retain `public_web` origin and source URL;
- Tavily failures degrade safely;
- configured include domains are passed to Tavily; and
- request-specific include domains override configured defaults.

## Known Gaps and Next Decisions

- `PUBLIC_SEARCH_INCLUDE_DOMAINS` is optional, so “trusted public sources” is
  only guaranteed when operators configure an allowlist.
- Tavily result scores are not filtered. Any non-empty Tavily result currently
  enters the context-agent path.
- Source authority is described to the context agent but is not independently
  verified.
- The API response does not expose a machine-readable outcome such as
  `clarification_required`, `public_source_not_found`, or `search_unavailable`.
- Partial retrieval is defined as “candidates exist, but none exceed the
  threshold.” Mixed strong and weak candidates use only the strong candidates.

The next reliability increment should make trusted-domain policy explicit and
add a public-result acceptance threshold before calling the agents.

## Implementation References

- `apps/api/src/application/retrieval/retrieval-service.ts`
- `apps/api/src/application/retrieval/request-classifier-service.ts`
- `apps/api/src/application/public-search/public-search-service.ts`
- `apps/api/src/infrastructure/public-search/tavily-public-search-service.ts`
- `apps/packages/agent-core/src/agents/rule-context-agent.ts`
- `apps/api/tests/retrieval-service.test.ts`
- `apps/api/tests/tavily-public-search-service.test.ts`
