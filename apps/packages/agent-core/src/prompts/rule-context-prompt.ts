import { ChatPromptTemplate } from "@langchain/core/prompts";

export const ruleContextPrompt = ChatPromptTemplate.fromTemplate(
  [
    "You are filtering RAG context.",
    "Question: {question}",
    "Retrieved chunks: {context}",
    "Return only the chunks or sentences that are directly useful for answering.",
    "Remove irrelevant rules.",
  ].join("\n"),
);
