import {
  requestId,
  responseError,
  responseSuccess,
  isJsonRequest,
  isSameOriginRequest,
  readJsonBody,
  AppError,
} from "@/lib/api/errors";
import { getServerEnv } from "@/lib/config/env";
import { seedRequestSchema } from "@/lib/domain/schemas";
import { runSeed } from "@/lib/ingestion/seed";

export const dynamic = "force-dynamic";
let seedActive = false;

export async function POST(request: Request): Promise<Response> {
  const id = requestId();
  try {
    const env = getServerEnv();
    if (!env.ENABLE_SEED_ROUTE)
      throw new AppError("SEED_ROUTE_DISABLED", "The local seed route is disabled.");
    if (!isJsonRequest(request) || !isSameOriginRequest(request))
      throw new AppError("INVALID_REQUEST", "Use a same-origin JSON request.");
    const body = seedRequestSchema.safeParse(await readJsonBody(request));
    if (!body.success) throw new AppError("INVALID_REQUEST", "The seed confirmation is not valid.");
    if (seedActive)
      throw new AppError("SEED_IN_PROGRESS", "Another seed is already running.", true);
    seedActive = true;
    try {
      return responseSuccess(await runSeed({ fixtureRoot: env.BLASTPATH_FIXTURE_ROOT }), id);
    } finally {
      seedActive = false;
    }
  } catch (error) {
    return responseError(error, id);
  }
}
