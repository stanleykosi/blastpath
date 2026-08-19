"use client";

import { useState } from "react";
import type { QueryEvidence } from "@/lib/domain/types";
import { Icon } from "@/components/icon";

export function QueryInspector({ query }: { query: QueryEvidence }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const safeText = `${query.query}\n\nparameters: ${JSON.stringify(query.parameters, null, 2)}`;
  async function copySafeQuery() {
    await navigator.clipboard.writeText(safeText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 3000);
  }
  return (
    <section
      className={`panel inspector-panel ${open ? "is-open" : ""}`}
      aria-labelledby="inspector-heading"
    >
      <button
        className="inspector-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <span className="eyebrow">PROOF LAYER</span>
          <strong id="inspector-heading">How HydraDB proved this</strong>
        </span>
        <span className="inspector-toggle-right">
          <span className="query-status">
            <Icon name="database" size={15} /> real execution
          </span>
          <Icon name="chevron" size={18} />
        </span>
      </button>
      {open && (
        <div className="inspector-content">
          <div className="inspector-summary">
            <div>
              <span>ENGINE</span>
              <strong>{query.engine}</strong>
            </div>
            <div>
              <span>PROCEDURE</span>
              <strong className="mono">{query.procedure}</strong>
            </div>
            <div>
              <span>DIRECTION</span>
              <strong className="mono">incoming</strong>
            </div>
            <div>
              <span>MAX DEPTH</span>
              <strong className="mono">{query.maxDepth}</strong>
            </div>
            <div>
              <span>ELAPSED</span>
              <strong className="mono">{query.elapsedMs} ms</strong>
            </div>
            <div>
              <span>RESULTS</span>
              <strong className="mono">{query.resultCount}</strong>
            </div>
          </div>
          <div className="query-code-head">
            <span className="eyebrow">SANITIZED CYPHER TEMPLATE · {query.templateId}</span>
            <button className="copy-button" type="button" onClick={copySafeQuery}>
              <Icon name="copy" size={15} /> {copied ? "Copied" : "Copy safe query"}
            </button>
          </div>
          <pre className="query-code">
            <code>{query.query}</code>
          </pre>
          <div className="query-params">
            <span className="eyebrow">SAFE PARAMETERS</span>
            {Object.entries(query.parameters).map(([key, value]) => (
              <div className="parameter-row" key={key}>
                <span className="mono">{key}</span>
                <span className="mono">{String(value)}</span>
              </div>
            ))}
          </div>
          <div className="query-ids">
            <span className="eyebrow">QUERY IDS</span>
            <ul>
              {query.queryIds.map((queryId) => (
                <li className="mono" key={queryId}>
                  {queryId}
                </li>
              ))}
            </ul>
          </div>
          <p className="query-footnote">
            Query IDs are visible for audit. Authorization headers and the HydraDB token never enter
            this view.
          </p>
        </div>
      )}
    </section>
  );
}
