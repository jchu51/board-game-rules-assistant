import type { PersistedChatMessage } from "@/api/chat-service";
import type { RetrievalSearchResponse } from "@/api/retrieval-api";

import type { AssistantMessage, Message, RetrievalAnswer } from "./chat-types";

export function buildRestoredMessages(
  conversationId: string,
  messages: PersistedChatMessage[],
): Message[] {
  return messages.map((message, index) => {
    const id = `history-${conversationId}-${index}`;

    if (message.role === "user") {
      return { id, role: "user", text: message.content };
    }

    return {
      id,
      role: "assistant",
      text: message.content,
      cites: [],
      phase: "done",
      revealed: message.content.length,
    };
  });
}

const compactWhitespace = (text: string) => text.replace(/\s+/g, " ").trim();

const excerptText = (text: string, maxLength = 420) => {
  const compactText = compactWhitespace(text);
  return compactText.length <= maxLength
    ? compactText
    : `${compactText.slice(0, maxLength - 1).trimEnd()}...`;
};

export const buildRetrievalAnswer = (
  response: RetrievalSearchResponse,
): RetrievalAnswer => {
  const { answer, matches } = response;
  if (matches.length === 0) {
    return {
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
  return {
    text: `${answer}\n\nSources: ${cites.map(({ n }) => `[[${n}]]`).join(" ")}`,
    cites,
  };
};

export const clearTimers = (timers: Record<string, number>) => {
  Object.values(timers).forEach((timerId) => window.clearInterval(timerId));
};

export const getLastCitedMessage = (messages: Message[]) =>
  [...messages]
    .reverse()
    .find(
      (message): message is AssistantMessage =>
        message.role === "assistant" &&
        message.phase === "done" &&
        message.cites.length > 0,
    );
