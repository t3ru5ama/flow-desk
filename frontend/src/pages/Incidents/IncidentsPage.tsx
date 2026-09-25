import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as incidentsApi from "../../api/incidents";
import { AppShell } from "../../components/layout/AppShell";
import { IncidentFormModal } from "../../components/incidents/IncidentFormModal";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/States";
import { INCIDENT_STATUS_BADGE, INCIDENT_STATUS_OPTIONS, SEVERITY_BADGE, SEVERITY_OPTIONS, roleAtLeast } from "../../lib/constants";
import { relativeTime, titleCase } from "../../lib/format";
import { useAuthStore } from "../../store/authStore";

export function IncidentsPage() {
  const [params, setParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const role = useAuthStore((s) => s.role);
  const severity = params.get("severity") || undefined;
  const status = params.get("status") || undefined;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["incidents", { severity, status }],
    queryFn: () => incidentsApi.listIncidents({ severity: severity as never, status: status as never }),
  });

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <AppShell title="Incidents">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-2">
          <Select value={severity ?? ""} onChange={(e) => setFilter("severity", e.target.value)}>
            <option value="">All severities</option>
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </Select>
          <Select value={status ?? ""} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">All statuses</option>
            {INCIDENT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
        </div>
        {roleAtLeast(role, "member") && <Button onClick={() => setShowForm(true)}>New incident</Button>}
      </div>

      {isPending ? (
        <LoadingState rows={5} />
      ) : isError ? (
        <ErrorState message="Couldn't load incidents." onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No incidents yet"
          actionLabel={roleAtLeast(role, "member") ? "Report incident" : undefined}
          onAction={roleAtLeast(role, "member") ? () => setShowForm(true) : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-fd-khaki bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-fd-khaki bg-fd-pearl text-xs uppercase text-fd-taupe">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.id} className="border-b border-fd-khaki last:border-0 hover:bg-fd-pearl/60">
                  <td className="px-4 py-3">
                    <Link to={`/incidents/${i.id}`} className="text-fd-cacao hover:text-fd-leather">
                      {i.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={SEVERITY_BADGE[i.severity]}>{i.severity.toUpperCase()}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={INCIDENT_STATUS_BADGE[i.status]}>{titleCase(i.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-fd-taupe">{i.assigned_team ?? "—"}</td>
                  <td className="px-4 py-3 text-fd-taupe">{relativeTime(i.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <IncidentFormModal onClose={() => setShowForm(false)} />}
    </AppShell>
  );
}
