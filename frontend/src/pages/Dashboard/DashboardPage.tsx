import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as approvalsApi from "../../api/approvals";
import * as incidentsApi from "../../api/incidents";
import * as notificationsApi from "../../api/notifications";
import * as tasksApi from "../../api/tasks";
import * as projectsListApi from "../../api/projects";
import { ActivityFeed } from "../../components/activity/ActivityFeed";
import { AppShell } from "../../components/layout/AppShell";
import { DashboardCard } from "../../components/dashboard/DashboardCard";
import { Badge } from "../../components/ui/Badge";
import { relativeTime } from "../../lib/format";
import { PRIORITY_BADGE, SEVERITY_BADGE } from "../../lib/constants";
import { useAuthStore } from "../../store/authStore";

const RANGE_DAYS: Record<"today" | "7d" | "30d", number> = { today: 1, "7d": 7, "30d": 30 };

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [range, setRange] = useState<"today" | "7d" | "30d">("7d");
  const since = useMemo(() => new Date(Date.now() - RANGE_DAYS[range] * 86400_000).toISOString(), [range]);

  const myTasks = useQuery({
    queryKey: ["dashboard", "myTasks", user?.id],
    queryFn: () => tasksApi.listTasks({ assignee_id: user!.id, page: 1 }),
    enabled: !!user,
  });
  const openTaskCount = myTasks.data?.items.filter((t) => t.status !== "done").length ?? 0;

  const activeIncidents = useQuery({
    queryKey: ["dashboard", "activeIncidents"],
    queryFn: () => incidentsApi.listIncidents({}),
  });
  const openIncidents = activeIncidents.data?.items.filter((i) => i.status !== "resolved") ?? [];

  const pendingApprovals = useQuery({
    queryKey: ["dashboard", "pendingApprovals"],
    queryFn: () => approvalsApi.listApprovals({ filter: "mine" }),
  });

  const projects = useQuery({
    queryKey: ["dashboard", "projects"],
    queryFn: () => projectsListApi.listProjects({}),
  });

  const notifications = useQuery({
    queryKey: ["dashboard", "notifications"],
    queryFn: () => notificationsApi.listNotifications({ unread: true, page_size: 5 }),
  });

  const doneThisRange = useQuery({
    queryKey: ["dashboard", "productivity", range],
    queryFn: () => tasksApi.listTasks({ status: "done", page: 1 }),
  });
  const completedInRange = (doneThisRange.data?.items ?? []).filter((t) => t.updated_at >= since).length;

  return (
    <AppShell title="Dashboard">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-fd-taupe">Welcome back, {user?.name.split(" ")[0]}.</p>
        <div className="flex gap-1 rounded-md border border-fd-khaki bg-white p-1">
          {(["today", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors duration-150 ${
                range === r ? "bg-fd-leather text-white" : "text-fd-taupe hover:text-fd-cacao"
              }`}
            >
              {r === "today" ? "Today" : r === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="My open tasks" value={openTaskCount} to="/tasks" />
        <StatTile label="Active incidents" value={openIncidents.length} to="/incidents" />
        <StatTile label="Awaiting my approval" value={pendingApprovals.data?.total ?? 0} to="/approvals" />
        <StatTile label="Tasks completed" value={completedInRange} sub={`in the last ${range === "today" ? "day" : range}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard
          title="Projects"
          isPending={projects.isPending}
          isError={projects.isError}
          isEmpty={(projects.data?.items.length ?? 0) === 0}
          emptyLabel="No projects yet"
        >
          <ul className="flex flex-col gap-2">
            {projects.data?.items.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className="text-sm text-fd-cacao hover:text-fd-leather">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </DashboardCard>

        <DashboardCard
          title="Active incidents"
          isPending={activeIncidents.isPending}
          isError={activeIncidents.isError}
          isEmpty={openIncidents.length === 0}
          emptyLabel="No active incidents"
        >
          <ul className="flex flex-col gap-2">
            {openIncidents.slice(0, 5).map((i) => (
              <li key={i.id} className="flex items-center justify-between">
                <Link to={`/incidents/${i.id}`} className="text-sm text-fd-cacao hover:text-fd-leather">
                  {i.title}
                </Link>
                <Badge variant={SEVERITY_BADGE[i.severity]}>{i.severity.toUpperCase()}</Badge>
              </li>
            ))}
          </ul>
        </DashboardCard>

        <DashboardCard
          title="Notifications"
          isPending={notifications.isPending}
          isError={notifications.isError}
          isEmpty={(notifications.data?.items.length ?? 0) === 0}
          emptyLabel="You're all caught up."
        >
          <ul className="flex flex-col gap-2">
            {notifications.data?.items.map((n) => (
              <li key={n.id} className="text-sm text-fd-cacao">
                {n.title}
                <div className="text-xs text-fd-taupe">{relativeTime(n.created_at)}</div>
              </li>
            ))}
          </ul>
        </DashboardCard>

        <DashboardCard
          title="My open tasks"
          isPending={myTasks.isPending}
          isError={myTasks.isError}
          isEmpty={openTaskCount === 0}
          emptyLabel="Nothing assigned to you"
        >
          <ul className="flex flex-col gap-2">
            {myTasks.data?.items
              .filter((t) => t.status !== "done")
              .slice(0, 5)
              .map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <Link to="/tasks" className="text-sm text-fd-cacao hover:text-fd-leather">
                    {t.title}
                  </Link>
                  <Badge variant={PRIORITY_BADGE[t.priority]}>{t.priority}</Badge>
                </li>
              ))}
          </ul>
        </DashboardCard>

        <div className="lg:col-span-2">
          <DashboardCard title="Recent activity" isPending={false} isError={false} isEmpty={false} emptyLabel="">
            <ActivityFeed limit={10} />
          </DashboardCard>
        </div>
      </div>
    </AppShell>
  );
}

function StatTile({ label, value, sub, to }: { label: string; value: number; sub?: string; to?: string }) {
  const content = (
    <div className="rounded-lg border border-fd-khaki bg-white p-5 transition-colors duration-150 hover:border-fd-taupe">
      <div className="text-2xl font-semibold text-fd-cacao">{value}</div>
      <div className="mt-1 text-sm text-fd-taupe">{label}</div>
      {sub && <div className="text-xs text-fd-taupe">{sub}</div>}
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}
