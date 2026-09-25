import type { ReactNode } from "react";
import { Card } from "../ui/Card";
import { LoadingState, ErrorState, EmptyState } from "../ui/States";

export function DashboardCard({
  title,
  isPending,
  isError,
  isEmpty,
  emptyLabel,
  action,
  children,
}: {
  title: string;
  isPending: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyLabel: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fd-cacao">{title}</h3>
        {action}
      </div>
      {isPending ? (
        <LoadingState rows={3} />
      ) : isError ? (
        <ErrorState message="Couldn't load this." />
      ) : isEmpty ? (
        <EmptyState title={emptyLabel} />
      ) : (
        children
      )}
    </Card>
  );
}
