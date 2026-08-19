import { requestId, responseError, responseSuccess } from "@/lib/api/errors";
import { getIncidentOverview } from "@/lib/api/incident-service";
import { parseIncidentId } from "@/lib/api/params";
import { HydraRepository } from "@/lib/hydradb/repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ incidentId: string }> },
): Promise<Response> {
  const id = requestId();
  try {
    const { incidentId: encodedIncidentId } = await context.params;
    const incidentId = parseIncidentId(encodedIncidentId);
    return responseSuccess(await getIncidentOverview(new HydraRepository(), incidentId), id);
  } catch (error) {
    return responseError(error, id);
  }
}
