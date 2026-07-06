import type { Request } from "express";

export type TypedRequestBody<TBody> = Request<
  Record<string, never>,
  unknown,
  TBody
>;
