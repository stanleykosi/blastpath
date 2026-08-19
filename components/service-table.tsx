import type { ServiceSummary } from "@/lib/domain/types";
import { ExposureBadge } from "@/components/exposure-badge";
import { Icon } from "@/components/icon";

export function ServiceTable({
  services,
  selectedId,
  onSelect,
}: {
  services: ServiceSummary[];
  selectedId: string;
  onSelect: (serviceId: string) => void;
}) {
  return (
    <section className="panel service-panel" aria-labelledby="service-heading">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">01 / ORGANIZATION SCOPE</span>
          <h2 id="service-heading">Ranked service exposure</h2>
        </div>
        <span className="panel-count mono">
          {services.length.toString().padStart(2, "0")} services
        </span>
      </div>
      <div className="service-table" role="table" aria-label="Ranked service exposure">
        <div className="service-row service-head" role="row">
          <span role="columnheader">Status</span>
          <span role="columnheader">Service</span>
          <span role="columnheader">Evidence</span>
          <span role="columnheader">Path</span>
          <span role="columnheader">Open</span>
        </div>
        {services.map((service) => (
          <button
            type="button"
            role="row"
            aria-selected={selectedId === service.id}
            className={`service-row ${selectedId === service.id ? "is-selected" : ""}`}
            key={service.id}
            onClick={() => onSelect(service.id)}
          >
            <span role="cell">
              <ExposureBadge status={service.status} />
            </span>
            <span role="cell" className="service-name-cell">
              <strong>{service.name}</strong>
              <small>
                {service.owner} · {service.criticality}
              </small>
            </span>
            <span role="cell" className="evidence-copy">
              {service.reason}
            </span>
            <span role="cell" className="path-length mono">
              {service.shortestPathLength === null ? "—" : `${service.shortestPathLength} hops`}
            </span>
            <span role="cell" className="row-action">
              <Icon name="chevron" size={17} />
            </span>
          </button>
        ))}
      </div>
      <p className="table-note">
        <span className="mono">HYDRADB</span> reverse traversal · status uses evidence text and
        icon, not color alone
      </p>
    </section>
  );
}
