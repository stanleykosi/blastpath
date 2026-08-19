"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IncidentOverview, ReplayResult, ServiceDetail } from "@/lib/domain/types";
import { Icon } from "@/components/icon";
import { IncidentHeader } from "@/components/incident-header";
import { MetricCard } from "@/components/metric-card";
import { ServiceTable } from "@/components/service-table";
import { EvidencePath } from "@/components/evidence-path";
import { ExposureBadge } from "@/components/exposure-badge";
import { IncidentTimeline } from "@/components/incident-timeline";
import { QueryInspector } from "@/components/query-inspector";
import { ContainmentPanel } from "@/components/containment-panel";
import { EmptyState } from "@/components/empty-state";
import { ErrorPanel } from "@/components/error-panel";
import { fetchData, type BrowserApiFailure } from "@/lib/api/browser-client";
import { replayResponseSchema, serviceDetailSchema } from "@/lib/api/contracts";

type ApiFailure = BrowserApiFailure;

function safeApiFailure(error: unknown, fallbackMessage: string): ApiFailure {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return { code: error.code, message: error.message };
  }
  return { code: "INTERNAL_ERROR", message: fallbackMessage };
}

export function AppShell({ initialOverview }: { initialOverview: IncidentOverview }) {
  const [selectedId, setSelectedId] = useState(initialOverview.services[0]?.id ?? "");
  const [detail, setDetail] = useState<ServiceDetail | null>(null);
  const [detailError, setDetailError] = useState<ApiFailure | null>(null);
  const [replay, setReplay] = useState<ReplayResult | null>(null);
  const [replayError, setReplayError] = useState<ApiFailure | null>(null);
  const [replayPending, setReplayPending] = useState(false);
  const selectedIdRef = useRef(selectedId);
  const detailRequestRef = useRef(0);
  const selectedService =
    initialOverview.services.find((service) => service.id === selectedId) ??
    initialOverview.services[0];

  const loadDetail = useCallback(
    async (serviceId: string) => {
      const requestNumber = detailRequestRef.current + 1;
      detailRequestRef.current = requestNumber;
      setDetail(null);
      setDetailError(null);
      setReplay(null);
      setReplayError(null);
      try {
        const next = await fetchData(
          `/api/incidents/${encodeURIComponent(initialOverview.incident.osvId)}/services/${encodeURIComponent(serviceId)}`,
          serviceDetailSchema,
        );
        if (detailRequestRef.current === requestNumber && selectedIdRef.current === serviceId)
          setDetail(next);
      } catch (error) {
        if (detailRequestRef.current === requestNumber && selectedIdRef.current === serviceId)
          setDetailError(safeApiFailure(error, "The service detail could not be loaded. Retry."));
      }
    },
    [initialOverview.incident.osvId],
  );

  useEffect(() => {
    if (!selectedId) return;
    const requestNumber = detailRequestRef.current + 1;
    detailRequestRef.current = requestNumber;
    let cancelled = false;
    void fetchData(
      `/api/incidents/${encodeURIComponent(initialOverview.incident.osvId)}/services/${encodeURIComponent(selectedId)}`,
      serviceDetailSchema,
    )
      .then((next) => {
        if (
          !cancelled &&
          detailRequestRef.current === requestNumber &&
          selectedIdRef.current === selectedId
        ) {
          setDetail(next);
          setDetailError(null);
        }
      })
      .catch((error: unknown) => {
        if (
          !cancelled &&
          detailRequestRef.current === requestNumber &&
          selectedIdRef.current === selectedId
        )
          setDetailError(safeApiFailure(error, "The service detail could not be loaded. Retry."));
      });
    return () => {
      cancelled = true;
    };
  }, [initialOverview.incident.osvId, selectedId]);

  const sharedPackageId = initialOverview.chokepoints[0]?.packageVersionId;
  const serviceNamesById = useMemo(
    () => new Map(initialOverview.services.map((service) => [service.id, service.name])),
    [initialOverview.services],
  );
  const removedServiceNames = useMemo(
    () =>
      replay?.removedServiceIds.map(
        (serviceId) => serviceNamesById.get(serviceId) ?? `Service ${serviceId}`,
      ) ?? [],
    [replay, serviceNamesById],
  );
  const sharedEdgeId = useMemo(
    () =>
      detail?.paths.flatMap((path) => path.edges).find((edge) => edge.source === sharedPackageId)
        ?.id,
    [detail, sharedPackageId],
  );

  async function simulateContainment() {
    if (!sharedEdgeId) return;
    setReplayPending(true);
    setReplayError(null);
    try {
      const result = await fetchData(
        `/api/incidents/${encodeURIComponent(initialOverview.incident.osvId)}/replay`,
        replayResponseSchema,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "exclude_dependency_edge",
            edgeIds: [sharedEdgeId],
            label: "Upgrade @blastpath/demo-platform from 2.4.0 to 2.4.1",
          }),
        },
      );
      setReplay(result);
    } catch (error) {
      setReplay(null);
      setReplayError(
        safeApiFailure(
          error,
          "The simulation could not be completed. Check HydraDB and retry the request.",
        ),
      );
    } finally {
      setReplayPending(false);
    }
  }

  return (
    <div className="console-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="BlastPath home">
          <span className="wordmark-mark">
            <Icon name="shield" size={19} />
          </span>
          <span>
            Blast<span>Path</span>
          </span>
        </Link>
        <div className="topbar-status">
          <span className="connection-pill">
            <span className="pulse-dot" /> <Icon name="database" size={14} /> HydraDB connected
          </span>
          <span className="demo-pill">DEMO DATA</span>
        </div>
      </header>
      <main id="main-content" className="main-content">
        <IncidentHeader incident={initialOverview.incident} />
        <section className="metrics-grid" aria-label="Incident metrics">
          <MetricCard
            label="Impacted services"
            value={initialOverview.metrics.impactedServices}
            detail="current affected paths"
            tone="danger"
            icon={<Icon name="alert" size={17} />}
          />
          <MetricCard
            label="Confirmed in window"
            value={initialOverview.metrics.confirmedExecution}
            detail="matching build evidence"
            tone="amber"
            icon={<Icon name="clock" size={17} />}
          />
          <MetricCard
            label="Exposure paths"
            value={initialOverview.metrics.exposurePaths}
            detail="HydraDB returned paths"
            tone="cyan"
            icon={<Icon name="arrow" size={17} />}
          />
          <MetricCard
            label="Safe services"
            value={initialOverview.metrics.safeServices}
            detail="fixed version resolved"
            tone="safe"
            icon={<Icon name="check" size={17} />}
          />
        </section>
        <div className="content-grid">
          <div className="content-main">
            <ServiceTable
              services={initialOverview.services}
              selectedId={selectedService?.id ?? ""}
              onSelect={(id) => {
                if (id === selectedIdRef.current) return;
                selectedIdRef.current = id;
                detailRequestRef.current += 1;
                setDetail(null);
                setDetailError(null);
                setReplay(null);
                setReplayError(null);
                setSelectedId(id);
              }}
            />
            <section className="panel evidence-panel" aria-labelledby="evidence-heading">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">02 / EXACT PROOF</span>
                  <h2 id="evidence-heading">Evidence path</h2>
                </div>
                {selectedService && <ExposureBadge status={selectedService.status} />}
              </div>
              <div className="selected-service-line">
                <strong>{selectedService?.name ?? "Select a service"}</strong>
                <span className="mono">
                  {detail
                    ? `${detail.paths.length} returned path${detail.paths.length === 1 ? "" : "s"}`
                    : "Loading detail…"}
                </span>
              </div>
              {detailError ? (
                <ErrorPanel
                  title="Service detail failed"
                  message={detailError.message}
                  onRetry={() => selectedId && void loadDetail(selectedId)}
                />
              ) : detail ? (
                detail.paths[0] ? (
                  <EvidencePath path={detail.paths[0]} sharedPackageId={sharedPackageId} />
                ) : (
                  <EmptyState
                    title="No affected path"
                    message="HydraDB found no path from this service to the affected package version."
                  />
                )
              ) : (
                <div className="skeleton path-skeleton" aria-label="Loading evidence path" />
              )}
            </section>
          </div>
          <aside className="content-side">
            {detail ? (
              <IncidentTimeline incident={initialOverview.incident} builds={detail.buildEvidence} />
            ) : (
              <div className="panel skeleton timeline-skeleton" aria-label="Loading timeline" />
            )}
            <ContainmentPanel
              chokepoint={initialOverview.chokepoints[0]}
              edgeId={sharedEdgeId}
              onReplay={() => void simulateContainment()}
              replay={replay}
              error={replayError}
              removedServiceNames={removedServiceNames}
              pending={replayPending}
              onReset={() => {
                setReplay(null);
                setReplayError(null);
              }}
            />
          </aside>
        </div>
        <QueryInspector query={detail?.query ?? initialOverview.query} />
        <footer className="console-footer">
          <span>
            <Icon name="shield" size={14} /> Evidence before prose
          </span>
          <span>
            Demo organization and build records are synthetic. Advisory and package facts are
            sourced from OSV and TanStack.
          </span>
          <span className="mono">BLASTPATH / {initialOverview.incident.osvId}</span>
        </footer>
      </main>
    </div>
  );
}
