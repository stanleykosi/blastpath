import type { ExposureStatus } from "@/lib/domain/types";
import { Icon } from "@/components/icon";

const labels: Record<ExposureStatus, string> = {
  confirmed_execution: "Confirmed execution",
  current_resolution_only: "Current resolution only",
  historical_status_unknown: "History unknown",
  safe: "No affected path",
};

const icons: Record<ExposureStatus, "alert" | "clock" | "check"> = {
  confirmed_execution: "alert",
  current_resolution_only: "clock",
  historical_status_unknown: "clock",
  safe: "check",
};

export function ExposureBadge({ status }: { status: ExposureStatus }) {
  return (
    <span className={`exposure-badge exposure-${status}`}>
      <Icon name={icons[status]} size={15} />
      <span>{labels[status]}</span>
    </span>
  );
}
