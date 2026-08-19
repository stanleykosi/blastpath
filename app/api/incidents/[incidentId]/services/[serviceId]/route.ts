import { requestId, responseError, responseSuccess } from "@/lib/api/errors";
import { getServiceDetail } from "@/lib/api/incident-service";
import { parseIncidentId, parseServiceId } from "@/lib/api/params";
import { HydraRepository } from "@/lib/hydradb/repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ incidentId: string; serviceId: string }> },
): Promise<Response> {
  const id = requestId();
  try {
    const { incidentId, serviceId } = await context.params;
    return responseSuccess(
      await getServiceDetail(
        new HydraRepository(),
        parseIncidentId(incidentId),
        parseServiceId(serviceId),
      ),
      id,
    );
  } catch (error) {
    return responseError(error, id);
  }
}
