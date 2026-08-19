import { Icon } from "@/components/icon";

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: string;
}) {
  return (
    <div className="state-card empty-state">
      <Icon name="database" size={22} />
      <h2>{title}</h2>
      <p>{message}</p>
      {action && <code>{action}</code>}
    </div>
  );
}
