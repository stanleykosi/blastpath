import type { ZodType } from "zod";
import { apiSuccessSchema, errorEnvelopeSchema } from "@/lib/api/contracts";

export type BrowserApiFailure = { code: string; message: string };

const invalidResponse: BrowserApiFailure = {
  code: "INTERNAL_ERROR",
  message: "The server returned an invalid response. Retry the request.",
};

export async function fetchData<T>(
  url: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  let body: unknown;
  try {
    body = (await response.json()) as unknown;
  } catch {
    throw invalidResponse;
  }

  if (!response.ok) {
    const failure = errorEnvelopeSchema.safeParse(body);
    throw failure.success ? failure.data.error : invalidResponse;
  }

  const success = apiSuccessSchema(schema).safeParse(body);
  if (!success.success) throw invalidResponse;
  return success.data.data;
}
