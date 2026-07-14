export type RulebookSourceType =
  | "private_upload"
  | "private_house_rule"
  | "shared_official_rulebook"
  | "shared_official_faq"
  | "shared_official_errata"
  | "community_rule_pack"
  | "premium_rule_pack";

export type RulebookVisibility = "private" | "shared" | "community" | "premium";

export type RulebookChunkMetadata = {
  documentId?: string;
  documentType?: string;
  documentVersion?: string;
  editionId?: string;
  gameId?: string;
  loc?: {
    pageNumber?: number;
  };
  ownerUserId?: string;
  parentHeading?: string;
  pdf?: {
    info?: unknown;
    metadata?: unknown;
    totalPages?: number;
    version?: string;
  };
  sectionHeading?: string;
  source?: string;
  sourceType?: RulebookSourceType;
  tenantId?: string;
  visibility?: RulebookVisibility;
};

export type RulebookChunk = {
  id?: string;
  pageContent: string;
  metadata: RulebookChunkMetadata;
};
