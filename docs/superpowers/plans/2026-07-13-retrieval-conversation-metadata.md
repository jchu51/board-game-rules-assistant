# Retrieval Conversation Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and persist a stable conversation title and eventually resolved board-game name from retrieval questions, return the title from retrieval, and render chat navigation as one flat list.

**Architecture:** A focused agent-core metadata agent produces validated `{ title, game }` output. The retrieval service applies the lifecycle rules, repositories persist nullable game metadata, and HTTP contracts expose title on retrieval plus game on chat reads. The web client treats server metadata as authoritative and removes game-based navigation grouping.

**Tech Stack:** TypeScript, LangChain, Express, Zod, PostgreSQL, React, Vitest, React Testing Library, OpenAPI YAML

## Global Constraints

- Generate the conversation title only for the first question and preserve it afterward.
- Store unresolved games as `NULL`, while treating legacy case-insensitive `Unknown` as unresolved.
- Retry game inference until a concrete game is stored; never replace a concrete game.
- `POST /retrieval/search` returns exactly `title`, `answer`, and `matches`.
- Chat list and detail endpoints return nullable `game`.
- Metadata inference failure must not block answer generation or message persistence.
- Render all chat navigation entries in one flat section without a game group or heading.
- Display a nullable game as `Unknown` in the active chat header.

---

### Task 1: Conversation Metadata Agent

**Files:**
- Create: `apps/packages/agent-core/src/prompts/conversation-metadata-prompt.ts`
- Create: `apps/packages/agent-core/src/agents/conversation-metadata-agent.ts`
- Modify: `apps/packages/agent-core/src/agents/index.ts`
- Modify: `apps/packages/agent-core/src/index.ts`
- Test: `apps/packages/agent-core/tests/conversation-metadata-agent.test.ts`
- Test: `apps/packages/agent-core/tests/prompts.test.ts`

**Interfaces:**
- Consumes: existing `AgentRuntime` and LangChain prompt utilities.
- Produces: `ConversationMetadata = { title: string; game: string | null }` and `ConversationMetadataAgent.run(question: string): Promise<ConversationMetadata>`.

- [ ] **Step 1: Write failing prompt and agent tests**

Add tests that require the prompt to ask for JSON only and require the agent to normalize valid output while rejecting invalid output:

```ts
it("parses concise conversation metadata", async () => {
  const runtime: AgentRuntime = {
    invoke: vi.fn().mockResolvedValue({
      messages: [{ text: '{"title":"Catan city production","game":"Catan"}' }],
    }),
  };
  const agent = new ConversationMetadataAgent("metadata", {} as ConfigurableModel, runtime);

  await expect(agent.run("How many resources does a Catan city make?")).resolves.toEqual({
    title: "Catan city production",
    game: "Catan",
  });
});

it("normalizes blank and Unknown games to null", async () => {
  // Run once with game "Unknown" and once with whitespace; both produce game: null.
});

it("rejects malformed metadata", async () => {
  // Runtime returns non-JSON and run rejects with AgentError.runFailed(...).
});
```

In `prompts.test.ts`, format `conversationMetadataPrompt` and assert its system message requires a short title, a concrete board-game name or null, and JSON with only `title` and `game`.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npm test -w @board-game-rules-assistant/agent-core -- tests/conversation-metadata-agent.test.ts tests/prompts.test.ts
```

Expected: FAIL because the metadata agent and prompt exports do not exist.

- [ ] **Step 3: Implement the prompt and agent**

Create a prompt with explicit output rules:

```ts
export const conversationMetadataPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    [
      "Create metadata for a board-game rules conversation.",
      "Return JSON only with exactly two properties: title and game.",
      "title must be a concise non-empty summary of the question.",
      "game must be the concrete board-game name when identifiable, otherwise null.",
      'Never use "Unknown" as the game value.',
    ].join(" "),
  ],
  ["human", "{question}"],
]);
```

Implement `ConversationMetadataAgent` with the existing runtime pattern. Strip an optional Markdown JSON fence, parse JSON, require a trimmed non-empty title, accept only a string or null game, and normalize blank or case-insensitive `Unknown` games to `null`. Wrap parsing/runtime failures in `AgentError.runFailed(this.name, error)`.

Export the new agent type and prompt from agent-core public barrels.

- [ ] **Step 4: Run tests to verify GREEN**

Run the Task 1 test command again. Expected: all selected tests PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add apps/packages/agent-core/src apps/packages/agent-core/tests
git commit -m "feat: add conversation metadata agent"
```

---

### Task 2: Persist Nullable Conversation Game Metadata

**Files:**
- Create: `apps/packages/database/migrations/0003_conversation_game.sql`
- Modify: `apps/packages/database/src/migrations.ts`
- Modify: `apps/packages/database/tests/migrations.test.ts`
- Modify: `apps/api/src/domain/conversation/conversation.ts`
- Modify: `apps/api/src/domain/conversation/conversation-repository.ts`
- Modify: `apps/api/src/infrastructure/persistence/conversation/in-memory-conversation-repository.ts`
- Modify: `apps/api/src/infrastructure/persistence/conversation/postgres-conversation-repository.ts`
- Test: `apps/api/tests/conversation-repository.test.ts`
- Test: `apps/api/tests/postgres-conversation-repository.test.ts`

**Interfaces:**
- Produces: `ConversationMetadata = { title: string; game: string | null }` in the conversation domain.
- Produces: `ConversationRepository.updateMetadata(conversationId: string, metadata: ConversationMetadata): Promise<void>`.
- Changes: `ConversationSummary` and `ConversationDetail` include `game: string | null`.

- [ ] **Step 1: Write failing repository and migration tests**

Add in-memory assertions:

```ts
await repository.updateMetadata(conversationId, {
  title: "Catan city production",
  game: "Catan",
});
await expect(repository.getChat(conversationId)).resolves.toMatchObject({
  title: "Catan city production",
  game: "Catan",
});
```

Update all summary/detail fixtures to expect `game: null` for new chats. Add a Postgres test requiring:

```ts
expect(query).toHaveBeenCalledWith(
  expect.stringMatching(/UPDATE conversations[\s\S]*title = \$2[\s\S]*game = \$3/),
  [conversationId, "Catan city production", "Catan"],
);
```

Extend the migration test to expect version `0003_conversation_game` and query `information_schema.columns` to verify `game` is nullable with no default.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npm test -w api -- tests/conversation-repository.test.ts tests/postgres-conversation-repository.test.ts
```

Expected: FAIL because summaries lack `game` and `updateMetadata` is undefined.

Run:

```bash
env TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:55432/board_game_rules npm test -w @board-game-rules-assistant/database -- tests/migrations.test.ts
```

Expected: FAIL because migration `0003_conversation_game` is absent.

- [ ] **Step 3: Implement domain and repository metadata persistence**

Add the domain type and fields:

```ts
export type ConversationMetadata = {
  title: string;
  game: string | null;
};

export type ConversationSummary = {
  conversationId: Conversation["id"];
  title: Conversation["title"];
  game: string | null;
};
```

Initialize in-memory chats with `game: null`, copy game through reads, and update only an existing chat in `updateMetadata`.

Update Postgres row types and `SELECT` lists to include `game`. Add:

```ts
async updateMetadata(
  conversationId: string,
  metadata: ConversationMetadata,
): Promise<void> {
  await this.pool.query(
    `UPDATE conversations
     SET title = $2, game = $3, updated_at = now()
     WHERE id = $1`,
    [conversationId, metadata.title, metadata.game],
  );
}
```

Create the additive migration:

```sql
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS game TEXT NULL;
```

Register `0003_conversation_game` after `0002_conversations`.

- [ ] **Step 4: Run tests to verify GREEN**

Run both Task 2 test commands again. Expected: all selected API and database tests PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add apps/packages/database apps/api/src/domain/conversation apps/api/src/infrastructure/persistence/conversation apps/api/tests/conversation-repository.test.ts apps/api/tests/postgres-conversation-repository.test.ts
git commit -m "feat: persist conversation game metadata"
```

---

### Task 3: Apply Metadata Lifecycle During Retrieval

**Files:**
- Modify: `apps/api/src/application/retrieval/retrieval-types.ts`
- Modify: `apps/api/src/application/retrieval/retrieval-service.ts`
- Modify: `apps/api/src/main.ts`
- Test: `apps/api/tests/retrieval-service.test.ts`

**Interfaces:**
- Consumes: `ConversationMetadataAgent`, `ConversationRepository.updateMetadata`.
- Changes: `RetrievalSearchResult = { title: string; answer: string; matches: RetrievalMatch[] }`.
- Changes: `RetrievalService` constructor accepts `createConversationMetadataAgent: () => ConversationMetadataAgent` after the repository dependency.

- [ ] **Step 1: Write failing retrieval lifecycle tests**

Create a test helper that creates a repository conversation and injects a recording metadata-agent factory. Add focused cases:

```ts
it("generates title and game for the first question", async () => {
  // Agent returns { title: "Catan city production", game: "Catan" }.
  // Assert result.title and repository.getChat(id) metadata.
});

it("preserves title while retrying a null game", async () => {
  // First agent result has game null; second has game "Catan".
  // Assert second result keeps the first title and stores Catan.
});

it("treats legacy Unknown as unresolved", async () => {
  // Seed metadata game "uNkNoWn", append an earlier turn, then assert agent runs.
});

it("does not invoke metadata after a concrete game is stored", async () => {
  // Seed title/game/messages and assert the factory is not called.
});

it("keeps retrieval successful when metadata generation fails", async () => {
  // Agent.run rejects; assert answer/messages persist and title remains New chat.
});
```

Update existing exact retrieval results to include `title`.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npm test -w api -- tests/retrieval-service.test.ts
```

Expected: FAIL because retrieval has no metadata factory/lifecycle and results lack `title`.

- [ ] **Step 3: Implement minimal lifecycle orchestration**

Use `getChat(conversationId)` to obtain current title, game, and messages. Fall back to `{ title: "New chat", game: null, messages: [] }` only for compatibility with direct service callers.

Introduce an internal answer-only type so existing retrieval branches continue returning `{ answer, matches }`. In `completeTurn`, resolve metadata using these rules:

```ts
const isFirstQuestion = conversation.messages.length === 0;
const gameIsUnresolved =
  conversation.game === null ||
  conversation.game.trim().toLowerCase() === "unknown";

if (isFirstQuestion || gameIsUnresolved) {
  try {
    const generated = await this.createConversationMetadataAgent().run(query);
    metadata = {
      title: isFirstQuestion ? generated.title : conversation.title,
      game: generated.game ?? null,
    };
  } catch (error) {
    console.error("conversation metadata generation failed:\n", error);
  }
}
```

Preserve a concrete existing game if present. Call `updateMetadata` only when metadata changes, append the messages, and return `{ title: metadata.title, ...answerResult }`.

Wire `ConversationMetadataAgent` in `main.ts` with the existing `chatModel`.

- [ ] **Step 4: Run tests to verify GREEN**

Run the Task 3 test command. Expected: all retrieval tests PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add apps/api/src/application/retrieval apps/api/src/main.ts apps/api/tests/retrieval-service.test.ts
git commit -m "feat: update conversation metadata during retrieval"
```

---

### Task 4: Update HTTP and OpenAPI Contracts

**Files:**
- Modify: `apps/api/src/presentation/http/retrieval/retrieval-schema.ts`
- Modify: `apps/api/src/presentation/http/chat/chat-schema.ts`
- Modify: `apps/api/openapi.yml`
- Test: `apps/api/tests/retrieval-schema.test.ts`
- Test: `apps/api/tests/http-routers.test.ts`

**Interfaces:**
- Retrieval response: exactly `{ title: string; answer: string; matches: RetrievalMatch[] }`.
- Chat summary/detail responses: add required nullable `game`.

- [ ] **Step 1: Write failing contract tests**

Require retrieval parsing to accept `title` and reject extra `game`:

```ts
expect(RetrievalSearchResponseSchema.parse({
  title: "Catan city production",
  answer: "Two resources.",
  matches: [],
})).toEqual({
  title: "Catan city production",
  answer: "Two resources.",
  matches: [],
});
```

Update router mocks/expectations to include title and chat game. Assert the OpenAPI text requires `title`, `answer`, and `matches` for retrieval, defines retrieval `game` nowhere, and defines nullable `game` on chat schemas.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npm test -w api -- tests/retrieval-schema.test.ts tests/http-routers.test.ts
```

Expected: FAIL because the runtime and OpenAPI schemas have not been updated.

- [ ] **Step 3: Implement schemas and OpenAPI**

Add `title: z.string().min(1)` to `RetrievalSearchResponseSchema`. Add `game: z.string().nullable()` to `ChatSummarySchema`, which also extends the detail schema.

In OpenAPI, add `game` as a required nullable property on `ChatSummary` and `GetChatResponse`. Define/update `RetrievalSearchResponse` so its required and only top-level properties are `title`, `answer`, and `matches`.

- [ ] **Step 4: Run tests to verify GREEN**

Run the Task 4 test command. Expected: all selected tests PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add apps/api/src/presentation/http apps/api/openapi.yml apps/api/tests/retrieval-schema.test.ts apps/api/tests/http-routers.test.ts
git commit -m "feat: expose conversation metadata contracts"
```

---

### Task 5: Synchronize Server Metadata in the Web Chat

**Files:**
- Modify: `apps/web/src/api/retrieval-api.ts`
- Modify: `apps/web/src/api/chat-service.ts`
- Modify: `apps/web/src/components/chat/chat-types.ts`
- Modify: `apps/web/src/components/chat/chat-helpers.ts`
- Modify: `apps/web/src/components/chat/chat-header.tsx`
- Modify: `apps/web/src/components/chat/use-chat-controller.ts`
- Test: `apps/web/src/api/api.test.ts`
- Test: `apps/web/src/components/chat/chat-helpers.test.ts`
- Test: `apps/web/src/pages/chat-page.test.tsx`

**Interfaces:**
- `RetrievalSearchResponse` gains `title: string` and still has no `game`.
- `ChatSummary` and `GetChatResponse` gain `game: string | null`.
- `RetrievalAnswer` becomes `{ text: string; cites: Citation[] }`.

- [ ] **Step 1: Write failing client and UI tests**

Update the retrieval API test fixture to return and expect `title`. Update all chat list/detail fixtures to include `game`.

Add a chat-page test:

```ts
searchRulebooks.mockResolvedValue({
  title: "Catan city production",
  answer: "Two resources.",
  matches: [],
});
getChat.mockResolvedValue({
  conversationId: "conversation-1",
  title: "Catan city production",
  game: "Catan",
  messages: [],
});

await submitQuestion("How many resources does a city make?");

expect(await screen.findByText("Catan city production")).toBeInTheDocument();
expect(screen.getByText("Catan")).toBeInTheDocument();
```

Add a header assertion that a `null` game renders `Unknown`. Update helper tests so `buildRetrievalAnswer` no longer derives or returns a game.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npm test -w web -- src/api/api.test.ts src/components/chat/chat-helpers.test.ts src/pages/chat-page.test.tsx
```

Expected: FAIL because response types omit title/game and the controller does not refresh metadata.

- [ ] **Step 3: Implement authoritative metadata synchronization**

Remove `detectGame` from the send path and stop constructing a local first-question title. Initialize/load conversations from server `title` and `game`.

After retrieval succeeds:

```ts
const refreshedChat = await getChat(conversationId).catch(() => null);
updateConversation(conversationId, (conversation) => ({
  ...conversation,
  title: response.title,
  game: refreshedChat?.game ?? conversation.game,
}));
completeAssistantMessage(
  conversationId,
  assistantMessage.id,
  buildRetrievalAnswer(response),
);
```

Keep a metadata-refresh failure from converting a successful answer into an error. Simplify `buildRetrievalAnswer` to consume only the response and return text/citations. Render the header badge unconditionally with `{conversation.game ?? "Unknown"}`.

- [ ] **Step 4: Run tests to verify GREEN**

Run the Task 5 test command. Expected: all selected web tests PASS.

- [ ] **Step 5: Commit Task 5**

```bash
git add apps/web/src/api apps/web/src/components/chat apps/web/src/pages/chat-page.test.tsx
git commit -m "feat: synchronize chat metadata from retrieval"
```

---

### Task 6: Flatten Chat Navigation

**Files:**
- Create: `apps/web/src/components/chat/conversation-list.tsx`
- Delete: `apps/web/src/components/chat/conversation-group.tsx`
- Delete: `apps/web/src/components/chat/conversation-group.test.tsx`
- Create: `apps/web/src/components/chat/conversation-list.test.tsx`
- Modify: `apps/web/src/components/chat/chat-navigation-content.tsx`
- Modify: `apps/web/src/components/chat/use-chat-controller.ts`
- Test: `apps/web/src/pages/chat-page.test.tsx`

**Interfaces:**
- Produces: `ConversationList` with `activeId`, `conversations`, optional `idPrefix`, `onDelete`, and `onSelect` props.
- Removes: `ChatController.gameGroups` and `ChatController.ungrouped`.
- Retains: `ChatController.filteredConversations`, including title/game search matching.

- [ ] **Step 1: Write failing flat-navigation tests**

Rename the component test and require selection/deletion without label or dot props. In the page test, load chats with concrete and null games, then assert both titles render while game group labels and the old `New` heading do not:

```ts
expect(screen.getByText("Catan roads")).toBeInTheDocument();
expect(screen.getByText("Pandemic outbreaks")).toBeInTheDocument();
expect(screen.queryByText("New")).not.toBeInTheDocument();
expect(screen.queryByText("Catan", { selector: "nav *" })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npm test -w web -- src/components/chat/conversation-list.test.tsx src/pages/chat-page.test.tsx
```

Expected: FAIL because `ConversationList` does not exist and navigation still renders group headings.

- [ ] **Step 3: Implement the flat list**

Move the conversation row markup from `ConversationGroup` into `ConversationList` and remove the heading, `label`, and `dotColor` props. In navigation render one list:

```tsx
{chat.filteredConversations.length > 0 ? (
  <ConversationList
    activeId={chat.activeId}
    conversations={chat.filteredConversations}
    idPrefix={idPrefix}
    onDelete={chat.deleteConversation}
    onSelect={(conversationId) => {
      void chat.selectConversation(conversationId);
      onNavigate?.();
    }}
  />
) : null}
```

Delete `ungrouped` and `gameGroups` calculations and returned controller fields. Preserve the existing filter predicate so search still matches title or game.

- [ ] **Step 4: Run tests to verify GREEN**

Run the Task 6 test command. Expected: all selected navigation/page tests PASS.

- [ ] **Step 5: Commit Task 6**

```bash
git add apps/web/src/components/chat apps/web/src/pages/chat-page.test.tsx
git commit -m "refactor: flatten chat navigation"
```

---

### Task 7: Format and Full Verification

**Files:**
- Modify only files changed automatically by the repository formatter, if any.

**Interfaces:**
- Verifies all previous task contracts together.

- [ ] **Step 1: Run repository formatting**

Run the repository's declared formatter and review any modified files:

```bash
npm run format
git status --short
```

Expected: formatter exits 0; status lists only files belonging to this feature.

- [ ] **Step 2: Run full static and automated verification**

Run:

```bash
npm test
npm run typecheck
npm run build
npm run lint -w api
git diff --check
```

Run the database suite:

```bash
env TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:55432/board_game_rules npm test -w @board-game-rules-assistant/database
```

Expected: every command exits 0 with no test failures, type errors, build errors, lint errors, or whitespace errors.

- [ ] **Step 3: Inspect final diff against the spec**

Confirm explicitly:

- retrieval returns only title/answer/matches;
- title is first-question-only;
- unresolved game retries and concrete game stops retries;
- nullable game persists and appears on chat reads;
- frontend displays `Unknown` for null;
- navigation contains one flat list and no groups.

- [ ] **Step 4: Commit formatter-only changes if present**

```bash
git add apps/api apps/web apps/packages
git commit -m "style: format conversation metadata changes"
```

Skip this commit when formatting made no changes.
