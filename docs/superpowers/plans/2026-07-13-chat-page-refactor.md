# Chat Page Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the Ask route to Chat and reduce the route file to one `ChatPage` component by extracting chat state and presentation components without changing behavior.

**Architecture:** `ChatPage` composes feature-specific components from `components/chat` and consumes state/actions from `useChat`. The hook owns retrieval and conversation lifecycle; pure helpers and shared types stay within the chat feature. React Router exposes `/chat` and redirects legacy `/ask` links.

**Tech Stack:** React 19, TypeScript 6, React Router 8, Vitest, React Testing Library, Vite, Tailwind CSS

## Global Constraints

- Preserve all current uncommitted UI work and chat behavior.
- `apps/web/src/pages/chat-page.tsx` exports only `ChatPage`.
- The primary route is `/chat`; `/ask` redirects to `/chat`.
- Keep action-oriented user copy such as “Ask the Referee” unchanged.
- Do not change retrieval API contracts, persistence, subscription behavior, or visual design.
- Every touched interactive element retains both a stable `id` and matching `data-testid`; add missing pairs while moving markup.

---

## File Map

- `apps/web/src/pages/chat-page.tsx`: route composition only.
- `apps/web/src/pages/chat-page.test.tsx`: route-level behavior tests.
- `apps/web/src/components/chat/chat-types.ts`: chat domain types.
- `apps/web/src/components/chat/chat-config.ts`: role, plan, game, example, and seed data.
- `apps/web/src/components/chat/chat-helpers.ts`: pure detection, citation, excerpt, and message helpers.
- `apps/web/src/components/chat/chat-helpers.test.ts`: pure helper coverage.
- `apps/web/src/components/chat/composer.tsx`: question composer.
- `apps/web/src/components/chat/conversation-message.tsx`: message and inline citation rendering.
- `apps/web/src/components/chat/conversation-sidebar.tsx`: chat search, grouping, selection, deletion, and Library link.
- `apps/web/src/components/chat/chat-workspace.tsx`: header, empty/chat content switch, composer placement, and sources layout.
- `apps/web/src/components/chat/sources-rail.tsx`: latest-answer sources.
- `apps/web/src/components/chat/plan-controls.tsx`: role selector, guest banner, and plan popover.
- `apps/web/src/components/chat/index.ts`: feature component exports.
- `apps/web/src/hooks/use-chat.ts`: state, timers, retrieval, and conversation actions.
- `apps/web/src/App.tsx`: Chat route and redirects.
- `apps/web/src/app.test.tsx`: routing compatibility tests.
- `apps/web/src/components/app-shell.tsx`: `/chat` shell bypass and navigation.
- Delete `apps/web/src/pages/ask-page.tsx` and its test after replacements pass.

### Task 1: Extract Chat Domain and State

**Files:**
- Create: `apps/web/src/components/chat/chat-types.ts`
- Create: `apps/web/src/components/chat/chat-config.ts`
- Create: `apps/web/src/components/chat/chat-helpers.ts`
- Create: `apps/web/src/components/chat/chat-helpers.test.ts`
- Create: `apps/web/src/hooks/use-chat.ts`
- Modify: `apps/web/src/pages/ask-page.tsx`
- Test: `apps/web/src/pages/ask-page.test.tsx`

**Interfaces:**
- Produces: `Citation`, `Message`, `AssistantMessage`, `Conversation`, `Role`, and `RetrievalAnswer` types.
- Produces: `detectGame(text: string): string | null`, `buildRetrievalAnswer(question: string, response: RetrievalSearchResponse): RetrievalAnswer`, and `getLastCitedMessage(messages: Message[]): AssistantMessage | undefined`.
- Produces: `useChat(): ChatController`, exposing active/filtered conversations, role/input/search/request state, and the existing conversation handlers.

- [ ] **Step 1: Add failing pure-helper tests**

```tsx
import { describe, expect, it } from "vitest";
import { buildRetrievalAnswer, detectGame } from "./chat-helpers";

describe("chat helpers", () => {
  it("detects a named game case-insensitively", () => {
    expect(detectGame("How does CATAN trading work?")).toBe("Catan");
  });

  it("maps retrieval matches to numbered citations", () => {
    expect(buildRetrievalAnswer("Catan city", {
      answer: "A city produces two resources.",
      matches: [{ origin: "rulebook", content: "Cities produce two resources.", metadata: { source: "catan.pdf", pageNumber: 8 } }],
    }).cites).toEqual([{ n: 1, book: "catan.pdf", page: 8, quote: "Cities produce two resources." }]);
  });
});
```

- [ ] **Step 2: Verify the new test fails before extraction**

Run: `npm test -w web -- src/components/chat/chat-helpers.test.ts`

Expected: FAIL because `./chat-helpers` does not exist.

- [ ] **Step 3: Move types, constants, and pure helpers without changing behavior**

```ts
export const detectGame = (text: string): string | null => {
  const normalizedText = ` ${text.toLowerCase()} `;
  for (const [token, game] of Object.entries(gamesByToken)) {
    if (normalizedText.includes(token)) return game;
  }
  return null;
};
```

Keep seed data, citation numbering, excerpt length, and fallback strings equivalent to the current page.

- [ ] **Step 4: Extract the controller hook and delegate from the existing page**

```ts
export type ChatController = {
  activeConversation: Conversation;
  filteredConversations: Conversation[];
  input: string;
  search: string;
  role: Role;
  guestAsked: number;
  isSearching: boolean;
  infoOpen: boolean;
  setActiveId: (id: string) => void;
  setInput: (value: string) => void;
  setSearch: (value: string) => void;
  setRole: (role: Role) => void;
  setInfoOpen: (open: boolean) => void;
  sendText: (override?: string) => Promise<void>;
  handleNewChat: () => void;
  deleteConversation: (id: string) => void;
};

export function useChat(): ChatController {
  const [conversations, setConversations] = useState(seedConversations);
  const [activeId, setActiveId] = useState(seedConversations[0].id);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role>("guest");
  const [guestAsked, setGuestAsked] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const timersRef = useRef<Record<string, number>>({});
  const activeSearchIdRef = useRef(0);

  return {
    activeConversation,
    filteredConversations,
    input,
    search,
    role,
    guestAsked,
    isSearching,
    infoOpen,
    setActiveId,
    setInput,
    setSearch,
    setRole,
    setInfoOpen,
    sendText,
    handleNewChat,
    deleteConversation,
  };
}
```

Move the existing `activeConversation`, `filteredConversations`, `sendText`, `handleNewChat`, `deleteConversation`, update helpers, and cleanup effect above the return without changing their bodies. Retain `activeSearchIdRef`, timer cleanup, and conversation-id checks as the stale-response guard.

- [ ] **Step 5: Run helper and existing page tests**

Run: `npm test -w web -- src/components/chat/chat-helpers.test.ts src/pages/ask-page.test.tsx`

Expected: PASS with existing Ask page scenarios unchanged.

- [ ] **Step 6: Commit the state extraction**

```bash
git add apps/web/src/components/chat apps/web/src/hooks/use-chat.ts apps/web/src/pages/ask-page.tsx apps/web/src/pages/ask-page.test.tsx
git commit -m "refactor(web): extract chat state"
```

### Task 2: Extract Presentation Components and Rename the Page

**Files:**
- Create: `apps/web/src/components/chat/composer.tsx`
- Create: `apps/web/src/components/chat/conversation-message.tsx`
- Create: `apps/web/src/components/chat/conversation-sidebar.tsx`
- Create: `apps/web/src/components/chat/chat-workspace.tsx`
- Create: `apps/web/src/components/chat/sources-rail.tsx`
- Create: `apps/web/src/components/chat/plan-controls.tsx`
- Create: `apps/web/src/components/chat/index.ts`
- Create: `apps/web/src/pages/chat-page.tsx`
- Create: `apps/web/src/pages/chat-page.test.tsx`
- Delete: `apps/web/src/pages/ask-page.tsx`
- Delete: `apps/web/src/pages/ask-page.test.tsx`

**Interfaces:**
- Consumes: `useChat(): ChatController` and chat types/config from Task 1.
- Produces: `ChatPage(): JSX.Element` as the only component declared by the route file.
- Produces: feature components exported by `@/components/chat` with narrow typed props and no retrieval API access.

- [ ] **Step 1: Rename the page test first and assert the new component name**

```tsx
import { ChatPage } from "./chat-page";

const renderChatPage = () => render(
  <MemoryRouter>
    <ChatPage />
  </MemoryRouter>,
);

describe("ChatPage", () => {
  it("renders the empty chat state", () => {
    renderChatPage();
    expect(screen.getByRole("heading", { name: "Ask the Referee" })).toBeInTheDocument();
  });
});
```

Carry forward every existing test and update only import/helper/describe names and identifiers intentionally renamed from `ask-*` to `chat-*`.

- [ ] **Step 2: Verify the renamed page test fails**

Run: `npm test -w web -- src/pages/chat-page.test.tsx`

Expected: FAIL because `chat-page.tsx` does not exist.

- [ ] **Step 3: Move each presentation component intact**

```tsx
export { Composer } from "./composer";
export { ChatWorkspace } from "./chat-workspace";
export { ConversationMessage } from "./conversation-message";
export { ConversationSidebar } from "./conversation-sidebar";
export { GuestBanner, PlanControls } from "./plan-controls";
export { SourcesRail } from "./sources-rail";
```

Each component receives values and callbacks through props. Keep classes, ARIA labels, copy, and interactions. Add matching `id` and `data-testid` only where moved interactive markup currently lacks them.

- [ ] **Step 4: Create a composition-only ChatPage**

```tsx
export function ChatPage() {
  const chat = useChat();
  const hasMessages = chat.activeConversation.messages.length > 0;

  return (
    <div className="flex h-svh bg-[#fafafb] font-sans text-[#14171f] antialiased">
      <ConversationSidebar controller={chat} />
      <ChatWorkspace controller={chat} hasMessages={hasMessages} />
    </div>
  );
}
```

`ChatWorkspace` is exported from `components/chat`; the route file declares no helper components and contains no API, timer, or citation-transform logic.

- [ ] **Step 5: Run renamed page and helper tests**

Run: `npm test -w web -- src/pages/chat-page.test.tsx src/components/chat/chat-helpers.test.ts`

Expected: PASS with all previous chat behaviors covered.

- [ ] **Step 6: Remove old page files and commit**

```bash
git add apps/web/src/components/chat apps/web/src/pages/chat-page.tsx apps/web/src/pages/chat-page.test.tsx apps/web/src/pages/ask-page.tsx apps/web/src/pages/ask-page.test.tsx
git commit -m "refactor(web): rename ask page to chat page"
```

### Task 3: Switch Routing to Chat and Verify

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/app.test.tsx`
- Modify: `apps/web/src/components/app-shell.tsx`
- Test: `apps/web/src/app.test.tsx`

**Interfaces:**
- Consumes: `ChatPage` from Task 2.
- Produces: canonical `/chat`, compatibility redirect `/ask`, and Chat navigation.

- [ ] **Step 1: Update routing tests before production routes**

```tsx
vi.mock("./pages/chat-page", () => ({
  ChatPage: () => <h1>Chat page</h1>,
}));

it.each([
  ["/", "Chat page"],
  ["/chat", "Chat page"],
  ["/ask", "Chat page"],
  ["/library", "Library page"],
  ["/unknown", "Chat page"],
])("routes %s", (route, heading) => {
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
});
```

Update navigation coverage to click the `Chat` link from `/library`.

- [ ] **Step 2: Verify routing tests fail**

Run: `npm test -w web -- src/app.test.tsx`

Expected: FAIL because App still imports `AskPage` and exposes `/ask` as canonical.

- [ ] **Step 3: Implement canonical and compatibility routes**

```tsx
<Route element={<AppShell />}>
  <Route index element={<Navigate to="/chat" replace />} />
  <Route path="chat" element={<ChatPage />} />
  <Route path="ask" element={<Navigate to="/chat" replace />} />
  <Route path="library" element={<LibraryPage />} />
  <Route path="*" element={<Navigate to="/chat" replace />} />
</Route>
```

In `AppShell`, bypass the shell for `/chat`, rename the menu item to `Chat`, set its destination to `/chat`, and update the brand destination to `/chat`.

- [ ] **Step 4: Run focused tests**

Run: `npm test -w web -- src/app.test.tsx src/pages/chat-page.test.tsx src/components/chat/chat-helpers.test.ts`

Expected: PASS.

- [ ] **Step 5: Run complete verification**

Run: `npm test -w web`

Expected: all web tests PASS.

Run: `npm run build -w web`

Expected: TypeScript and Vite production build PASS.

Run: `npm run lint -w web`

Expected: oxlint PASS with no errors.

Run the repository auto-format workflow, then run `git diff --check`.

Expected: formatting completes and no whitespace errors are reported.

- [ ] **Step 6: Inspect scope and commit routing changes**

```bash
git status --short
git add apps/web/src/App.tsx apps/web/src/app.test.tsx apps/web/src/components/app-shell.tsx
git commit -m "refactor(web): make chat the canonical route"
```

Confirm unrelated files, including `Ask Referee.dc.html`, are not staged.
