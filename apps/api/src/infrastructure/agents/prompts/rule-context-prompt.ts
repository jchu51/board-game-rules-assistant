import { ChatPromptTemplate } from "@langchain/core/prompts";

import { CONTEXT_ORIGIN } from "../../../domain/retrieval/context-origin.js";

export const ruleContextPrompt = ChatPromptTemplate.fromTemplate(
  [
    "You are filtering retrieved context for a board-game rules question.",
    `Each chunk is labeled with its origin: ${CONTEXT_ORIGIN.rulebook} chunks come from`,
    `officially uploaded rulebooks and are authoritative; ${CONTEXT_ORIGIN.publicWeb} chunks`,
    "come from public web search and may be unofficial.",
    "Question: {question}",
    "Retrieved chunks: {context}",
    "Return only the chunks or sentences that are directly useful for answering,",
    "keeping each chunk's origin and source labels.",
    "Remove irrelevant rules.",
  ].join("\n"),
);
