import "dotenv/config";

export type NodeEnv = "local" | "development" | "test" | "production";

export type Config = {
  nodeEnv: NodeEnv;
  host: string;
  port: number;
  corsOrigin: string;
};

const parseNodeEnv = (value: string | undefined): NodeEnv => {
  if (
    value === "local" ||
    value === "development" ||
    value === "test" ||
    value === "production"
  ) {
    return value;
  }

  return "local";
};

export const config: Config = {
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 8000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
