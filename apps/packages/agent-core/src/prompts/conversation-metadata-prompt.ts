import { ChatPromptTemplate } from "@langchain/core/prompts";

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
