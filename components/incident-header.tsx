import type { IncidentOverview } from "@/lib/domain/types";
import { Icon } from "@/components/icon";

export function IncidentHeader({ incident }: { incident: IncidentOverview["incident"] }) {
  return (
    <section className="incident-header" aria-labelledby="incident-title">
      <div className="incident-kicker">
        <span className="critical-mark">
          <Icon name="alert" size={14} /> CRITICAL INCIDENT
        </span>
        <span className="mono incident-id">{incident.osvId}</span>
        <span className="data-badge">SYNTHETIC ORG DATA</span>
      </div>
      <div className="incident-heading-row">
        <div>
          <h1 id="incident-title">{incident.summary}</h1>
          <p className="incident-subtitle">
            Dependency exposure command center for the Acme Demo organization.
          </p>
        </div>
        <a className="source-link" href={incident.sourceUrl} target="_blank" rel="noreferrer">
          View advisory <Icon name="arrow" size={15} />
        </a>
      </div>
      <div className="window-strip">
        <span className="window-dot" />
        <span className="window-label">INCIDENT WINDOW</span>
        <span className="mono window-value">
          {formatUtc(incident.windowStart)} — {formatUtc(incident.windowEnd)}
        </span>
        <span className="window-note">six minutes · UTC</span>
      </div>
    </section>
  );
}

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  }).format(new Date(value));
}
