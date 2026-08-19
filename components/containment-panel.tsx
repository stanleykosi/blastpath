"use client";

import { useEffect, useState } from "react";
import type { IncidentOverview, ReplayResult } from "@/lib/domain/types";
import { Icon } from "@/components/icon";
import { ErrorPanel } from "@/components/error-panel";

export function ContainmentPanel({
  chokepoint,
  edgeId,
  onReplay,
  replay,
  error,
  removedServiceNames,
  pending,
  onReset,
}: {
  chokepoint?: IncidentOverview["chokepoints"][number];
  edgeId?: string;
  onReplay: () => void;
  replay: ReplayResult | null;
  error: { code: string; message: string } | null;
  removedServiceNames: string[];
  pending: boolean;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    const mobileDisclosure = window.matchMedia("(max-width: 640px)");
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && mobileDisclosure.matches) setExpanded(false);
    };
    const restoreOnDesktop = (event: MediaQueryListEvent) => {
      if (!event.matches) setExpanded(true);
    };
    window.addEventListener("keydown", closeOnEscape);
    mobileDisclosure.addEventListener("change", restoreOnDesktop);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      mobileDisclosure.removeEventListener("change", restoreOnDesktop);
    };
  }, []);
  if (!chokepoint)
    return (
      <section className="panel containment-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">04 / CONTAINMENT</span>
            <h2>Shared chokepoint</h2>
          </div>
        </div>
        <div className="empty-inline">
          <Icon name="check" size={18} />
          <p>No shared dependency path is present in this graph.</p>
        </div>
      </section>
    );
  return (
    <section className="panel containment-panel" aria-labelledby="containment-heading">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">04 / CONTAINMENT</span>
          <h2 id="containment-heading">Shared chokepoint</h2>
        </div>
        <span className="rank-badge">#1 CUT</span>
      </div>
      {expanded && (
        <>
          <div className="chokepoint-card">
            <div className="chokepoint-glyph">
              <Icon name="shield" size={20} />
            </div>
            <div>
              <span className="eyebrow">SHARED BY {chokepoint.serviceCount} IMPACTED SERVICES</span>
              <strong className="mono">
                {chokepoint.name}@{chokepoint.version}
              </strong>
              <p>{chokepoint.pathCount} dangerous paths converge on this version.</p>
            </div>
          </div>
          <div className="recommendation">
            <span className="recommendation-label">RECOMMENDED ACTION</span>
            <strong>{chokepoint.recommendation}</strong>
            <span className="mono action-edge">edge {edgeId ?? "pending path"}</span>
          </div>
          {replay ? (
            <div className="replay-result" aria-live="polite">
              <div className="replay-result-head">
                <span className="success-mark">
                  <Icon name="check" size={16} /> SIMULATION COMPLETE
                </span>
                <button type="button" className="text-button" onClick={onReset}>
                  Reset simulation
                </button>
              </div>
              <div className="replay-counts">
                <div>
                  <span>IMPACTED SERVICES</span>
                  <strong>
                    <s>{replay.baseline.impactedServices}</s> → {replay.simulated.impactedServices}
                  </strong>
                </div>
                <div>
                  <span>EXPOSURE PATHS</span>
                  <strong>
                    <s>{replay.baseline.exposurePaths}</s> → {replay.simulated.exposurePaths}
                  </strong>
                </div>
              </div>
              <div className="removed-services">
                <span>REMOVED SERVICES</span>
                <ul>
                  {removedServiceNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
              <p>{replay.disclaimer}</p>
            </div>
          ) : error ? (
            <div className="replay-error">
              <ErrorPanel title="Simulation failed" message={error.message} onRetry={onReplay} />
            </div>
          ) : (
            <>
              <p className="containment-copy">
                Simulate the shared edge exclusion over observed HydraDB paths. The baseline graph
                stays unchanged.
              </p>
              <button
                className="primary-button"
                type="button"
                disabled={pending || !edgeId}
                onClick={onReplay}
              >
                <Icon name="play" size={16} /> {pending ? "Simulating…" : "Simulate containment"}
              </button>
              {!edgeId && (
                <p className="button-note">
                  Load an impacted service path to enable the simulation.
                </p>
              )}
            </>
          )}
        </>
      )}
      <button
        type="button"
        className="mobile-disclosure"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Hide simulation detail" : "Show simulation detail"}
        <Icon name="chevron" size={16} />
      </button>
    </section>
  );
}
