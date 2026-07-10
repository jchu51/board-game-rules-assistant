import type { Request, Response } from "express";

export type TypedRequestBody<TBody> = Request<
  Record<string, never>,
  unknown,
  TBody
>;

export type TypedResponse<TBody> = Response<TBody>;

export type ErrorResponseBody = {
  error: string;
};
