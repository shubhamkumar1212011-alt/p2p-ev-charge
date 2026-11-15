import { apiErrorSchema } from "@/lib/api-schemas";
import { z } from "zod";

export async function parseApiResponse<Schema extends z.ZodType>(
  response: Response,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    const errorResult = apiErrorSchema.safeParse(payload);
    throw new Error(
      errorResult.success ? errorResult.data.error : "The request failed.",
    );
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error("The server returned an invalid response.");
  }

  return result.data;
}
