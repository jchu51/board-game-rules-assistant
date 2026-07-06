import {
  RecursiveCharacterTextSplitter,
  type RecursiveCharacterTextSplitterParams,
} from "@langchain/textsplitters";
import type { RulebookDocument } from "../documents/rulebook-document.js";

export const chunkDocuments = async (
  docs: RulebookDocument[],
  fields?: Partial<RecursiveCharacterTextSplitterParams>,
): Promise<RulebookDocument[]> => {
  const splitter = new RecursiveCharacterTextSplitter(fields);
  return splitter.splitDocuments(docs);
};
