import { ArrowUp, BookOpen, Plus, type LucideIcon } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  searchRulebooks,
  type RetrievalSearchResponse,
} from "@/api/retrieval-api";
import { cn } from "@/lib/utils";

type Citation = {
  n: number;
  book: string;
  page?: number;
  quote: string;
};

type UserMessage = {
  id: string;
  role: "user";
  text: string;
};

type AssistantPhase = "thinking" | "streaming" | "done";

type AssistantMessage = {
  id: string;
  role: "assistant";
  text: string;
  cites: Citation[];
  phase: AssistantPhase;
  revealed: number;
};

type Message = UserMessage | AssistantMessage;

type RetrievalAnswer = {
  game: string | null;
  text: string;
  cites: Citation[];
};

const gamesByToken: Record<string, string> = {
  azul: "Azul",
  catan: "Catan",
  gloomhaven: "Gloomhaven",
  monopoly: "Monopoly",
  pandemic: "Pandemic",
  root: "Root",
  scythe: "Scythe",
  "terraforming mars": "Terraforming Mars",
  "ticket to ride": "Ticket to Ride",
  wingspan: "Wingspan",
};

const gameIdsByName: Record<string, string> = {
  Azul: "00000000-0000-4000-8000-000000000001",
  Catan: "00000000-0000-4000-8000-000000000002",
  Gloomhaven: "00000000-0000-4000-8000-000000000003",
  Monopoly: "00000000-0000-4000-8000-000000000004",
  Pandemic: "00000000-0000-4000-8000-000000000005",
  Root: "00000000-0000-4000-8000-000000000006",
  Scythe: "00000000-0000-4000-8000-000000000007",
  "Terraforming Mars": "00000000-0000-4000-8000-000000000008",
  "Ticket to Ride": "00000000-0000-4000-8000-000000000009",
  Wingspan: "00000000-0000-4000-8000-000000000010",
};

const exampleQuestions = [
  {
    id: "ask-example-catan-road-btn",
    label: "In Catan, can I build a road through an opponent's settlement?",
  },
  {
    id: "ask-example-gloomhaven-infusion-btn",
    label: "How does elemental infusion work in Gloomhaven?",
  },
  {
    id: "ask-example-ticket-to-ride-btn",
    label: "In Ticket to Ride, what if I cannot complete a ticket?",
  },
  {
    id: "ask-example-root-vagabond-btn",
    label: "Can the Vagabond be attacked while allied in Root?",
  },
];

const detectGame = (text: string): string | null => {
  const normalizedText = ` ${text.toLowerCase()} `;

  for (const [token, game] of Object.entries(gamesByToken)) {
    if (normalizedText.includes(token)) return game;
  }

  return null;
};

const compactWhitespace = (text: string) => text.replace(/\s+/g, " ").trim();

const excerptText = (text: string, maxLength = 420) => {
  const compactText = compactWhitespace(text);

  if (compactText.length <= maxLength) return compactText;

  return `${compactText.slice(0, maxLength - 1).trimEnd()}...`;
};

const buildRetrievalAnswer = (
  question: string,
  response: RetrievalSearchResponse,
): RetrievalAnswer => {
  const game = detectGame(question);
  const { answer, matches } = response;

  if (matches.length === 0) {
    return {
      game,
      text:
        answer ||
        "I could not find a matching passage in the indexed rulebooks. Try uploading the rulebook in Library first, or ask with the game name and a more specific rule term.",
      cites: [],
    };
  }

  const cites = matches.map((match, index) => ({
    n: index + 1,
    book: match.metadata.source ?? "Indexed rulebook",
    page: match.metadata.pageNumber,
    quote: excerptText(match.content),
  }));
  const citationList = cites.map((citation) => `[[${citation.n}]]`).join(" ");

  return {
    game,
    text: `${answer}\n\nSources: ${citationList}`,
    cites,
  };
};

const autosizeTextarea = (textarea: HTMLTextAreaElement) => {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(160, textarea.scrollHeight)}px`;
};

const clearTimers = (timers: Record<string, number>) => {
  Object.values(timers).forEach((timerId) => window.clearInterval(timerId));
};

function CitationMarker({ n }: { n: string }) {
  return (
    <sup className="mx-0.5 inline-flex h-[15px] min-w-[15px] items-center justify-center rounded bg-primary px-1 align-super text-[10px] leading-none font-semibold text-primary-foreground">
      {n}
    </sup>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="Thinking">
      {[0, 1, 2].map((dotIndex) => (
        <span
          key={dotIndex}
          className="size-[7px] rounded-full bg-muted-foreground ref-dot"
          style={{ animationDelay: `${dotIndex * 0.18}s` }}
        />
      ))}
    </span>
  );
}

const renderAnswerText = (message: AssistantMessage): ReactNode => {
  if (message.phase === "thinking") return <ThinkingDots />;

  const visibleText = message.text.slice(0, message.revealed);
  const nodes: ReactNode[] = [];
  const citationPattern = /\[\[(\d+)\]\]/g;
  let cursor = 0;
  let match = citationPattern.exec(visibleText);

  while (match) {
    if (match.index > cursor) {
      nodes.push(visibleText.slice(cursor, match.index));
    }

    nodes.push(<CitationMarker key={`cite-${match.index}`} n={match[1]} />);
    cursor = match.index + match[0].length;
    match = citationPattern.exec(visibleText);
  }

  if (cursor < visibleText.length) {
    nodes.push(visibleText.slice(cursor));
  }

  if (message.phase === "streaming") {
    nodes.push(
      <span
        key="cursor"
        className="ml-0.5 inline-block h-[15px] w-[7px] align-text-bottom bg-primary ref-blink"
      />,
    );
  }

  return nodes;
};

function Sources({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4">
      <div className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        Sources
      </div>
      {citations.map((citation) => (
        <div key={citation.n} className="flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex size-[18px] shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-primary">
            {citation.n}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-primary">
              {citation.book}
              {citation.page ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  - p. {citation.page}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 text-[13px] leading-6 text-muted-foreground italic">
              "{citation.quote}"
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssistantAvatar({ Icon = BookOpen }: { Icon?: LucideIcon }) {
  return (
    <div className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <Icon className="size-[15px]" aria-hidden="true" />
    </div>
  );
}

function ConversationMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[16px_16px_4px_16px] bg-muted px-4 py-3 text-[15px] leading-6 whitespace-pre-wrap text-foreground">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="mb-1.5 text-[13px] font-semibold text-foreground">
          Referee
        </div>
        <div className="text-[15px] leading-7 whitespace-pre-wrap text-primary">
          {renderAnswerText(message)}
        </div>
        {message.phase === "done" ? (
          <Sources citations={message.cites} />
        ) : null}
      </div>
    </div>
  );
}

type ComposerProps = {
  idPrefix: string;
  input: string;
  placeholder: string;
  helperText: string;
  isSubmitting: boolean;
  onInputChange: (nextInput: string) => void;
  onSend: () => void;
};

function Composer({
  idPrefix,
  input,
  placeholder,
  helperText,
  isSubmitting,
  onInputChange,
  onSend,
}: ComposerProps) {
  const canSend = input.trim().length > 0 && !isSubmitting;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSend();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <form
      id={`${idPrefix}-composer-form`}
      data-testid={`${idPrefix}-composer-form`}
      className="rounded-2xl border border-border bg-background p-3 pb-2.5 shadow-sm"
      onSubmit={handleSubmit}
    >
      <label
        id={`${idPrefix}-question-label`}
        data-testid={`${idPrefix}-question-label`}
        htmlFor={`${idPrefix}-question-input`}
        className="sr-only"
      >
        Ask a rules question
      </label>
      <textarea
        id={`${idPrefix}-question-input`}
        data-testid={`${idPrefix}-question-input`}
        value={input}
        rows={1}
        placeholder={placeholder}
        className="max-h-40 min-h-[36px] w-full resize-none border-0 bg-transparent px-1.5 py-1 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground"
        onChange={(event) => {
          onInputChange(event.target.value);
          autosizeTextarea(event.target);
        }}
        onKeyDown={handleKeyDown}
      />
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="pl-1 text-xs text-muted-foreground">{helperText}</span>
        <button
          id={`${idPrefix}-send-btn`}
          data-testid={`${idPrefix}-send-btn`}
          type="submit"
          disabled={!canSend}
          aria-label={isSubmitting ? "Searching rulebooks" : "Send question"}
          className={cn(
            "inline-flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50",
            canSend
              ? "cursor-pointer opacity-100 hover:bg-primary/80"
              : "cursor-not-allowed opacity-35",
          )}
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

export function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const conversationIdRef = useRef(crypto.randomUUID());
  const scrollRef = useRef<HTMLElement | null>(null);
  const timersRef = useRef<Record<string, number>>({});
  const messageIdRef = useRef(0);
  const activeSearchIdRef = useRef(0);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    scrollElement.scrollTop = scrollElement.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const timers = timersRef.current;

    return () => clearTimers(timers);
  }, []);

  const nextMessageId = (prefix: string) => {
    messageIdRef.current += 1;
    return `${prefix}-${messageIdRef.current}`;
  };

  const startStreaming = (messageId: string, textLength: number) => {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId && message.role === "assistant"
          ? { ...message, phase: "streaming" }
          : message,
      ),
    );

    const step = Math.max(2, Math.round(textLength / 90));

    window.clearInterval(timersRef.current[messageId]);
    timersRef.current[messageId] = window.setInterval(() => {
      setMessages((currentMessages) =>
        currentMessages.map((message) => {
          if (message.id !== messageId || message.role !== "assistant") {
            return message;
          }

          const revealed = Math.min(
            message.text.length,
            message.revealed + step,
          );

          if (revealed >= message.text.length) {
            window.clearInterval(timersRef.current[messageId]);
            delete timersRef.current[messageId];
            return { ...message, revealed: message.text.length, phase: "done" };
          }

          return { ...message, revealed };
        }),
      );
    }, 18);
  };

  const completeAssistantMessage = (
    messageId: string,
    answer: RetrievalAnswer,
  ) => {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId && message.role === "assistant"
          ? {
              ...message,
              text: answer.text,
              cites: answer.cites,
              phase: "streaming",
              revealed: 0,
            }
          : message,
      ),
    );
    startStreaming(messageId, answer.text.length);
  };

  const failAssistantMessage = (messageId: string, error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to search rulebooks";
    const assistantText = `I could not search the indexed rulebooks: ${errorMessage}`;

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId && message.role === "assistant"
          ? {
              ...message,
              text: assistantText,
              cites: [],
              phase: "done",
              revealed: assistantText.length,
            }
          : message,
      ),
    );
  };

  const sendText = async (rawText = input) => {
    const question = rawText.trim();
    if (!question || isSearching) return;

    const detectedGame = detectGame(question);
    const userMessage: UserMessage = {
      id: nextMessageId("user"),
      role: "user",
      text: question,
    };
    const assistantMessage: AssistantMessage = {
      id: nextMessageId("assistant"),
      role: "assistant",
      text: "",
      cites: [],
      phase: "thinking",
      revealed: 0,
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      assistantMessage,
    ]);
    setInput("");
    if (detectedGame) setCurrentGame(detectedGame);
    setIsSearching(true);

    const searchId = activeSearchIdRef.current + 1;
    activeSearchIdRef.current = searchId;
    const isStaleSearch = () => activeSearchIdRef.current !== searchId;

    try {
      const gameId = gameIdsByName[detectedGame ?? currentGame ?? ""];
      if (!gameId) {
        throw new Error("Name the board game so its rulebook can be searched.");
      }
      const response = await searchRulebooks({
        conversationId: conversationIdRef.current,
        gameId,
        query: question,
      });
      if (isStaleSearch()) return;

      const answer = buildRetrievalAnswer(question, response);
      if (answer.game) setCurrentGame(answer.game);
      completeAssistantMessage(assistantMessage.id, answer);
    } catch (error) {
      if (isStaleSearch()) return;

      failAssistantMessage(assistantMessage.id, error);
    } finally {
      if (!isStaleSearch()) {
        setIsSearching(false);
      }
    }
  };

  const handleNewChat = () => {
    activeSearchIdRef.current += 1;
    clearTimers(timersRef.current);
    timersRef.current = {};
    conversationIdRef.current = crypto.randomUUID();
    setMessages([]);
    setInput("");
    setCurrentGame(null);
    setIsSearching(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[15px] font-semibold">Ask</span>
          {currentGame ? (
            <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              {currentGame}
            </span>
          ) : null}
        </div>
        <button
          id="ask-new-chat-btn"
          data-testid="ask-new-chat-btn"
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[13px] font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={handleNewChat}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          New chat
        </button>
      </header>

      {!hasMessages ? (
        <main className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8">
          <div className="flex w-full max-w-[640px] flex-col items-center gap-7">
            <div className="flex flex-col items-center gap-2.5 text-center">
              <div className="mb-1 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BookOpen className="size-6" aria-hidden="true" />
              </div>
              <h1 className="m-0 text-3xl font-semibold tracking-tight">
                Ask the Rules Assistant
              </h1>
              <p className="m-0 max-w-[46ch] text-[15px] leading-6 text-muted-foreground">
                Ask any board-game rules question. Name the game and the
                assistant will answer from its rulebook with page citations.
              </p>
            </div>

            <div className="w-full">
              <Composer
                idPrefix="ask-empty"
                input={input}
                placeholder="e.g. In Catan, can I build a road through an opponent's settlement?"
                helperText="Searches indexed rulebooks and cites matching pages."
                isSubmitting={isSearching}
                onInputChange={setInput}
                onSend={() => sendText()}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {exampleQuestions.map((example) => (
                <button
                  key={example.id}
                  id={example.id}
                  data-testid={example.id}
                  type="button"
                  disabled={isSearching}
                  className="rounded-full border border-border bg-background px-3.5 py-2 text-left text-[13px] leading-5 text-foreground outline-none transition-colors hover:border-ring hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  onClick={() => sendText(example.label)}
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
        </main>
      ) : (
        <>
          <main
            ref={scrollRef}
            className="ref-scroll min-h-0 flex-1 overflow-y-auto"
          >
            <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-6 pt-7 pb-3">
              {messages.map((message) => (
                <ConversationMessage key={message.id} message={message} />
              ))}
            </div>
          </main>

          <footer className="shrink-0 bg-gradient-to-t from-background from-65% to-transparent px-6 pt-3 pb-5">
            <div className="mx-auto max-w-[720px]">
              <Composer
                idPrefix="ask-chat"
                input={input}
                placeholder="Ask a follow-up, or name another game..."
                helperText="Searches indexed rulebooks and cites matching pages."
                isSubmitting={isSearching}
                onInputChange={setInput}
                onSend={() => sendText()}
              />
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default AskPage;
