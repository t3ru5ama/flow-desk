import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as notificationsApi from "../../api/notifications";
import { relativeTime } from "../../lib/format";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: count } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  });

  const { data: preview } = useQuery({
    queryKey: ["notifications", "preview"],
    queryFn: () => notificationsApi.listNotifications({ page_size: 5 }),
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-fd-cacao hover:bg-fd-khaki/50 transition-colors duration-150"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {!!count && count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-fd-error px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-fd-khaki bg-white p-2 shadow-lg">
            {!preview || preview.items.length === 0 ? (
              <p className="p-4 text-center text-sm text-fd-taupe">You're all caught up.</p>
            ) : (
              preview.items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markReadMutation.mutate(n.id);
                    setOpen(false);
                    if (n.link) navigate(n.link);
                  }}
                  className={`block w-full rounded-md p-2 text-left text-sm hover:bg-fd-pearl ${!n.read ? "font-medium" : "text-fd-taupe"}`}
                >
                  <div className="text-fd-cacao">{n.title}</div>
                  <div className="text-xs text-fd-taupe">{relativeTime(n.created_at)}</div>
                </button>
              ))
            )}
            <button
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="mt-1 block w-full rounded-md p-2 text-center text-xs text-fd-leather hover:bg-fd-pearl"
            >
              View all
            </button>
          </div>
        </>
      )}
    </div>
  );
}
