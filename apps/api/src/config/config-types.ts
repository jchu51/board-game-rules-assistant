export type NodeEnv = "local" | "development" | "test" | "production";

export type Config = {
  nodeEnv: NodeEnv;
  host: string;
  port: number;
  corsOrigin: string;
  ingestion: {
    openAiApiKey: string;
    embeddingModel: string;
    defaultChunkSize: number;
    defaultChunkOverlap: number;
    uploadDirectory: string;
    maxUploadSizeBytes: number;
  };
};
