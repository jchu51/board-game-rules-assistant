import { z } from "zod";

export const CreateGlobalDocumentRequestSchema = z.object({
  title: z.string().trim().min(1),
  kind: z.enum(["base_rules", "expansion", "errata", "other"]),
  documentId: z.string().uuid().optional(),
});

export const GlobalVersionResponseSchema = z.object({
  id: z.string().uuid(), status: z.enum(["ready", "published"]),
  verifiedAt: z.date().nullable(), verifiedBy: z.string().uuid().nullable(),
}).transform((value) => ({ ...value, verifiedAt: value.verifiedAt?.toISOString() ?? null }));

export const CreateGlobalDocumentResponseSchema = z.object({
  document: z.object({ id: z.string().uuid(), gameId: z.string().uuid(), title: z.string(), kind: z.string() }),
  version: z.object({ id: z.string().uuid(), status: z.literal("ready"), versionNumber: z.number().int() }),
});
