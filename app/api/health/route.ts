import { HydradbError, requestId, responseError, responseSuccess } from "@/lib/api/errors";
import { HydraRepository } from "@/lib/hydradb/repository";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const id = requestId();
  try {
    const repository = new HydraRepository();
    if (!(await repository.ready()))
      return responseError(new HydradbError("HYDRADB_UNAVAILABLE", "HydraDB is not ready."), id);
    const marker = await repository.seedMarker();
    if (!marker.seeded)
      return responseError(
        new HydradbError("HYDRADB_UNAVAILABLE", "The graph seed marker is unavailable."),
        id,
      );
    return responseSuccess(
      { status: "ok", app: "ok", hydradb: "ok", graphSeeded: true, seedVersion: marker.version },
      id,
    );
  } catch (error) {
    return responseError(error, id);
  }
}
