import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as notificationsApi from "../../api/notifications";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/Button";
import { Pagination } from "../../components/ui/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/States";
import { relativeTime } from "../../lib/format";

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["notifications", "all", page],
    queryFn: () => notificationsApi.listNotifications({ page }),
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <AppShell title="Notifications">
      <div className="mb-4 flex justify-end">
        <Button variant="secondary" onClick={() => markAllMutation.mutate()}>
          Mark all as read
        </Button>
      </div>

      {isPending ? (
        <LoadingState rows={6} />
      ) : isError ? (
        <ErrorState message="Couldn't load notifications." onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <EmptyState title="You're all caught up." />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {data.items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read) markReadMutation.mutate(n.id);
                  if (n.link) navigate(n.link);
                }}
                className={`flex items-start justify-between gap-3 rounded-lg border border-fd-khaki bg-white p-4 text-left transition-colors duration-150 hover:border-fd-taupe ${!n.read ? "border-l-4 border-l-fd-leather" : ""}`}
              >
                <div>
                  <p className={`text-sm ${n.read ? "text-fd-taupe" : "font-medium text-fd-cacao"}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-fd-taupe">{n.body}</p>}
                </div>
                <span className="shrink-0 text-xs text-fd-taupe">{relativeTime(n.created_at)}</span>
              </button>
            ))}
          </div>
          <Pagination page={data.page} total={data.total} pageSize={data.page_size} onPageChange={setPage} />
        </>
      )}
    </AppShell>
  );
}
