import type { EvidencePath } from "@/lib/domain/types";
import { Icon } from "@/components/icon";

export function EvidencePath({
  path,
  sharedPackageId,
}: {
  path?: EvidencePath;
  sharedPackageId?: string;
}) {
  if (!path)
    return (
      <div className="empty-inline">
        <Icon name="database" size={18} />
        <p>No affected dependency path was returned by HydraDB.</p>
      </div>
    );
  return (
    <div className="path-block">
      <div className="path-visual" aria-hidden="true">
        {path.nodes.map((node, index) => (
          <div className="path-segment" key={node.id}>
            <div
              className={`path-node path-node-${node.label.toLowerCase()} ${node.id === sharedPackageId ? "path-node-shared" : ""} ${index === path.nodes.length - 1 ? "path-node-danger" : ""}`}
            >
              <span className="node-label">
                {node.label === "Service"
                  ? "SERVICE"
                  : node.label === "PackageVersion"
                    ? "PACKAGE VERSION"
                    : node.label.toUpperCase()}
              </span>
              <strong>{node.name}</strong>
              {node.version && <span className="mono node-version">@{node.version}</span>}
              {node.id === sharedPackageId && (
                <span className="shared-chip">shared by 2 services</span>
              )}
            </div>
            {index < path.edges.length && (
              <>
                <div className="path-arrow">
                  <Icon name="arrow" size={18} />
                </div>
                <span className="path-edge-ref mono">{path.edges[index].sourceRef}</span>
              </>
            )}
          </div>
        ))}
      </div>
      <ol className="sr-only path-list" aria-label="Ordered dependency evidence path">
        {path.nodes.map((node, index) => (
          <li key={node.id}>
            {node.name}
            {node.version ? `@${node.version}` : ""}
            {index < path.edges.length ? `, via ${path.edges[index].sourceRef}` : ""}
          </li>
        ))}
      </ol>
      <div className="path-meta">
        <span className="mono">PATH {path.id}</span>
        <span>{path.length} dependency hops</span>
        <span>{path.edges.length} HydraDB edges</span>
      </div>
    </div>
  );
}
