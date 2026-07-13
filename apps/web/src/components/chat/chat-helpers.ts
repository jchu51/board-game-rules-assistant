import type { RetrievalSearchResponse } from "@/api/retrieval-api";

import { gamesByToken } from "./chat-config";
import type { AssistantMessage, Message, RetrievalAnswer } from "./chat-types";

export const detectGame = (text: string): string | null => {
  const normalizedText = ` ${text.toLowerCase()} `;
  for (const [token, game] of Object.entries(gamesByToken)) {
    if (normalizedText.includes(token)) return game;
  }
  return null;
};

const compactWhitespace = (text: string) => text.replace(/\s+/g, " ").trim();

const excerptText = (text: string, maxLength = 420) => {
  const compactText = compactWhitespace(text);
  return compactText.length <= maxLength
    ? compactText
    : `${compactText.slice(0, maxLength - 1).trimEnd()}...`;
};

export const buildRetrievalAnswer = (
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
  return {
    game,
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
