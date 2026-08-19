"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";

export function ErrorPanel({
  title = "HydraDB is not available",
  message,
  onRetry,
  retry = false,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retry?: boolean;
}) {
  const router = useRouter();
  const retryAction = onRetry ?? (retry ? () => router.refresh() : undefined);
  return (
    <div className="state-card error-state" role="alert">
      <Icon name="alert" size={22} />
      <h2>{title}</h2>
      <p>{message}</p>
      {retryAction && (
        <button type="button" className="secondary-button" onClick={retryAction}>
          <Icon name="refresh" size={16} /> Retry request
        </button>
      )}
    </div>
  );
}
