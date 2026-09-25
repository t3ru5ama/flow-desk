import type { ReactNode } from "react";
import { Button } from "./Button";

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 w-full animate-pulse rounded-md bg-fd-khaki/40" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-fd-khaki bg-white py-12 text-center">
      <p className="text-sm text-fd-error">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-fd-khaki bg-white py-16 text-center">
      <p className="text-sm font-medium text-fd-cacao">{title}</p>
      {description && <p className="max-w-sm text-sm text-fd-taupe">{description}</p>}
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

export function QuerySection({
  isPending,
  isError,
  isEmpty,
  emptyLabel,
  onRetry,
  children,
  rows,
}: {
  isPending: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyLabel: string;
  onRetry?: () => void;
  children: ReactNode;
  rows?: number;
}) {
  if (isPending) return <LoadingState rows={rows} />;
  if (isError) return <ErrorState message="Couldn't load data." onRetry={onRetry} />;
  if (isEmpty) return <EmptyState title={emptyLabel} />;
  return <>{children}</>;
}
