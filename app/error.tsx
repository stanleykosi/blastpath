"use client";

import { ErrorPanel } from "@/components/error-panel";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="standalone-state">
      <ErrorPanel
        title="Unexpected application error"
        message="The page did not load. Retry the request."
        onRetry={reset}
      />
    </main>
  );
}
