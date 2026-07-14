import type { Document, DocumentInterface } from "@langchain/core/documents";
import type { RulebookChunkMetadata } from "../../../domain/rulebook/rulebook-chunk.js";

export type RulebookDocument = Document<RulebookChunkMetadata>;

export type RulebookDocumentInterface =
  DocumentInterface<RulebookChunkMetadata>;
