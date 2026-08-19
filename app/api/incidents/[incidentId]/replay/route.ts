import {
  requestId,
  responseError,
  responseSuccess,
  isJsonRequest,
  isSameOriginRequest,
  readJsonBody,
  AppError,
} from "@/lib/api/errors";
import { getIncidentSnapshot } from "@/lib/api/incident-service";
import { parseIncidentId } from "@/lib/api/params";
import { replayRequestSchema } from "@/lib/domain/schemas";
import { simulateReplay } from "@/lib/domain/replay";
import { HydraRepository } from "@/lib/hydradb/repository";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ incidentId: string }> },
): Promise<Response> {
  const id = requestId();
  try {
    if (!isJsonRequest(request) || !isSameOriginRequest(request))
      throw new AppError("INVALID_REQUEST", "Use a same-origin JSON request.");
    const body = replayRequestSchema.safeParse(await readJsonBody(request));
    if (!body.success) throw new AppError("INVALID_REQUEST", "The replay request is not valid.");
    const { incidentId } = await context.params;
    const snapshot = await getIncidentSnapshot(new HydraRepository(), parseIncidentId(incidentId));
    return responseSuccess(simulateReplay(body.data, snapshot.paths), id);
  } catch (error) {
    return responseError(error, id);
  }
}
