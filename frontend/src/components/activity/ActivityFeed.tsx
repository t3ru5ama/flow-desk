import { useQuery } from "@tanstack/react-query";
import * as auditApi from "../../api/audit";
import { relativeTime, titleCase } from "../../lib/format";
import { EmptyState, ErrorState, LoadingState } from "../ui/States";
import type { AuditLog } from "../../types";

function describe(log: AuditLog): string {
  const [resource, action] = log.action.split(".");
  return `${titleCase(resource ?? log.resource_type)} ${titleCase(action ?? log.action)}`;
}

export function ActivityFeed({
  resourceType,
  resourceId,
  limit = 10,
}: {
  resourceType?: string;
  resourceId?: string;
  limit?: number;
}) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["audit", resourceType, resourceId, limit],
    queryFn: () => auditApi.listAuditLogs({ resource_type: resourceType, resource_id: resourceId, page_size: limit }),
  });

  if (isPending) return <LoadingState rows={4} />;
  if (isError) return <ErrorState message="Couldn't load activity." onRetry={refetch} />;
  if (data.items.length === 0) return <EmptyState title="No activity yet" />;

  return (
    <ul className="flex flex-col gap-3">
      {data.items.map((log) => (
        <li key={log.id} className="flex items-start justify-between gap-3 text-sm">
          <span className="text-fd-cacao">{describe(log)}</span>
          <span className="shrink-0 text-xs text-fd-taupe">{relativeTime(log.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}
