import "dotenv/config";

export type Config = {
  nodeEnv: string;
  host: string;
  port: number;
  corsOrigin: string;
};

export const config: Config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 8000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
