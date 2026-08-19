import { requestId, responseError, responseSuccess } from "@/lib/api/errors";
import { HydraRepository } from "@/lib/hydradb/repository";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const id = requestId();
  try {
    return responseSuccess(await new HydraRepository().listIncidents(), id);
  } catch (error) {
    return responseError(error, id);
  }
}
