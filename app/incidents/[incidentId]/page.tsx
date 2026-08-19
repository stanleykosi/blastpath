import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { ErrorPanel } from "@/components/error-panel";
import { getIncidentOverview } from "@/lib/api/incident-service";
import { AppError, HydradbError } from "@/lib/api/errors";
import { HydraRepository } from "@/lib/hydradb/repository";

export const dynamic = "force-dynamic";

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ incidentId: string }>;
}) {
  const { incidentId } = await params;
  let overview: Awaited<ReturnType<typeof getIncidentOverview>> | null = null;
  let state: "graph" | "hydradb" | "error" | null = null;
  try {
    overview = await getIncidentOverview(new HydraRepository(), decodeURIComponent(incidentId));
  } catch (error) {
    if (error instanceof AppError && error.code === "GRAPH_NOT_SEEDED") state = "graph";
    else if (error instanceof HydradbError) state = "hydradb";
    else state = "error";
  }
  if (overview) return <AppShell initialOverview={overview} />;
  if (state === "graph")
    return (
      <main className="standalone-state">
        <EmptyState
          title="Graph not seeded"
          message="Load the committed demo fixtures into HydraDB, then open this incident again."
          action="npm run seed"
        />
      </main>
    );
  if (state === "hydradb")
    return (
      <main className="standalone-state">
        <ErrorPanel
          message="HydraDB did not return the incident evidence. Check the local node and retry."
          retry
        />
      </main>
    );
  return (
    <main className="standalone-state">
      <ErrorPanel
        title="Incident could not load"
        message="The incident request failed. Retry after HydraDB is ready and seeded."
        retry
      />
    </main>
  );
}
