export default function Loading() {
  return (
    <main className="standalone-state">
      <div className="loading-card">
        <div className="skeleton loading-line loading-line-short" />
        <div className="skeleton loading-line" />
        <div className="skeleton loading-block" />
      </div>
    </main>
  );
}
