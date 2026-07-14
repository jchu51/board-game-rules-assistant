import { ChatPromptTemplate } from "@langchain/core/prompts";

export const conversationTitlePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    [
      "Create a title for a board-game rules conversation.",
      "Return JSON only with exactly one property: title.",
      "title must be a concise non-empty summary of the question.",
    ].join(" "),
  ],
  ["human", "{question}"],
]);
