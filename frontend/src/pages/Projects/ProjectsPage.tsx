import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as projectsApi from "../../api/projects";
import { AppShell } from "../../components/layout/AppShell";
import { ProjectFormModal } from "../../components/projects/ProjectFormModal";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Select } from "../../components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/States";
import { PRIORITY_BADGE, PRIORITY_OPTIONS, PROJECT_STATUS_BADGE, PROJECT_STATUS_OPTIONS, roleAtLeast } from "../../lib/constants";
import { formatDate, titleCase } from "../../lib/format";
import { useAuthStore } from "../../store/authStore";

export function ProjectsPage() {
  const [params, setParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const role = useAuthStore((s) => s.role);
  const status = params.get("status") || undefined;
  const priority = params.get("priority") || undefined;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["projects", { status, priority }],
    queryFn: () => projectsApi.listProjects({ status: status as never, priority: priority as never }),
  });

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <AppShell title="Projects">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-2">
          <Select value={status ?? ""} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">All statuses</option>
            {PROJECT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
          <Select value={priority ?? ""} onChange={(e) => setFilter("priority", e.target.value)}>
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {titleCase(p)}
              </option>
            ))}
          </Select>
        </div>
        {roleAtLeast(role, "manager") && <Button onClick={() => setShowForm(true)}>New project</Button>}
      </div>

      {isPending ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <ErrorState message="Couldn't load projects." onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No projects yet"
          actionLabel={roleAtLeast(role, "manager") ? "Create project" : undefined}
          onAction={roleAtLeast(role, "manager") ? () => setShowForm(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`}>
              <Card className="h-full transition-colors duration-150 hover:border-fd-taupe">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-fd-cacao">{p.name}</h3>
                  <Badge variant={PRIORITY_BADGE[p.priority]}>{titleCase(p.priority)}</Badge>
                </div>
                {p.description && <p className="mt-2 line-clamp-2 text-sm text-fd-taupe">{p.description}</p>}
                <div className="mt-4 flex items-center justify-between">
                  <Badge variant={PROJECT_STATUS_BADGE[p.status]}>{titleCase(p.status)}</Badge>
                  <span className="text-xs text-fd-taupe">Due {formatDate(p.due_date)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showForm && <ProjectFormModal onClose={() => setShowForm(false)} />}
    </AppShell>
  );
}
