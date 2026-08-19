import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  tone: "danger" | "amber" | "cyan" | "safe";
  icon: ReactNode;
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-top">
        <span className="metric-icon">{icon}</span>
        <span className="metric-label">{label}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  );
}
