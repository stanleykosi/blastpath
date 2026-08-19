import type { BuildEvidence, IncidentOverview } from "@/lib/domain/types";
import { Icon } from "@/components/icon";

export function IncidentTimeline({
  incident,
  builds,
}: {
  incident: IncidentOverview["incident"];
  builds: Array<Omit<BuildEvidence, "timestampMs">>;
}) {
  const sorted = [...builds].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return (
    <section className="panel timeline-panel" aria-labelledby="timeline-heading">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">03 / TEMPORAL EVIDENCE</span>
          <h2 id="timeline-heading">Build timeline</h2>
        </div>
        <span className="timeline-window mono">
          {formatTime(incident.windowStart)}–{formatTime(incident.windowEnd)} UTC
        </span>
      </div>
      <div className="timeline" role="list" aria-label="Build evidence timeline">
        <div className="timeline-band" aria-hidden="true">
          <span>19:20</span>
          <span>19:26</span>
        </div>
        {sorted.length === 0 && (
          <div className="timeline-empty">
            <Icon name="clock" size={17} /> No matching build evidence supplied.
          </div>
        )}
        {sorted.map((build) => (
          <div
            className={`timeline-event ${build.inWindow ? "event-in" : "event-out"}`}
            role="listitem"
            key={build.buildId}
          >
            <span className="event-marker" />
            <div>
              <strong className="mono">{build.buildId}</strong>
              <span className="event-time mono">
                {formatTime(build.timestamp)} UTC · {build.environment}
              </span>
              <span className="event-state">
                {build.inWindow ? "inside incident window" : "outside incident window"}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="timeline-note">
        Current path evidence and historical build evidence are separate facts. A missing record
        does not mean the package did not execute.
      </p>
    </section>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  }).format(new Date(value));
}
