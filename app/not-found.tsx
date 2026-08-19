import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <main className="standalone-state">
      <EmptyState
        title="Incident not found"
        message="Use the seeded incident URL from the manual live-test guide."
      />
    </main>
  );
}
