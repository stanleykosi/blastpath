import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { ErrorPanel } from "@/components/error-panel";
import { HydraRepository } from "@/lib/hydradb/repository";
import { homeFailureState } from "@/lib/api/home-state";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let incident: Awaited<ReturnType<HydraRepository["listIncidents"]>>[number] | undefined;
  let state: "unseeded" | "hydradb" | "error" | null = null;
  try {
    const incidents = await new HydraRepository().listIncidents();
    incident = incidents[0];
  } catch (error) {
    state = homeFailureState(error);
  }
  if (incident) redirect(`/incidents/${encodeURIComponent(incident.osvId)}`);
  if (state === "unseeded")
    return (
      <main className="standalone-state">
        <EmptyState
          title="Graph not seeded"
          message="Load the committed demo fixtures into HydraDB, then return to this page."
          action="npm run seed"
        />
      </main>
    );
  if (state === "hydradb")
    return (
      <main className="standalone-state">
        <ErrorPanel message="Start HydraDB, run the seed command, and retry this page." retry />
      </main>
    );
  if (state === "error")
    return (
      <main className="standalone-state">
        <ErrorPanel
          title="Incident list could not load"
          message="The incident request failed. Retry after HydraDB is ready and seeded."
          retry
        />
      </main>
    );
  return (
    <main className="standalone-state">
      <EmptyState
        title="No seeded incident"
        message="Load the committed demo fixtures into HydraDB, then return to this page."
        action="npm run seed"
      />
    </main>
  );
}
