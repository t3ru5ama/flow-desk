import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as tasksApi from "../../api/tasks";
import * as projectsApi from "../../api/projects";
import { AppShell } from "../../components/layout/AppShell";
import { TaskDetailDrawer } from "../../components/tasks/TaskDetailDrawer";
import { TaskFormModal } from "../../components/tasks/TaskFormModal";
import { TaskTable } from "../../components/tasks/TaskTable";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Input";
import { Pagination } from "../../components/ui/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/States";
import { useDebounce } from "../../hooks/useDebounce";
import { PRIORITY_OPTIONS, TASK_STATUS_OPTIONS, roleAtLeast } from "../../lib/constants";
import { titleCase } from "../../lib/format";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";

export function TasksPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const debouncedSearch = useDebounce(search);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const role = useAuthStore((s) => s.role);
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  const filters = {
    status: (params.get("status") as never) || undefined,
    priority: (params.get("priority") as never) || undefined,
    project_id: params.get("project_id") || undefined,
    page: Number(params.get("page") ?? 1),
    search: debouncedSearch || undefined,
  };

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => tasksApi.listTasks(filters),
  });
  const projects = useQuery({ queryKey: ["projects", "minimal"], queryFn: () => projectsApi.listProjects({}) });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => tasksApi.updateTask(id, { status: status as never }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addToast("Task updated");
    },
  });

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  }

  const hasActiveFilters = !!(filters.status || filters.priority || filters.project_id || filters.search);

  return (
    <AppShell title="Tasks">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <Input placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={filters.status ?? ""} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">All statuses</option>
            {TASK_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
          <Select value={filters.priority ?? ""} onChange={(e) => setFilter("priority", e.target.value)}>
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {titleCase(p)}
              </option>
            ))}
          </Select>
          <Select value={filters.project_id ?? ""} onChange={(e) => setFilter("project_id", e.target.value)}>
            <option value="">All projects</option>
            {projects.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        {roleAtLeast(role, "member") && <Button onClick={() => setShowForm(true)}>New task</Button>}
      </div>

      {isPending ? (
        <LoadingState rows={8} />
      ) : isError ? (
        <ErrorState message="Couldn't load tasks." onRetry={refetch} />
      ) : data.items.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState title="No tasks match these filters" />
        ) : (
          <EmptyState title="No tasks yet" actionLabel="Create task" onAction={() => setShowForm(true)} />
        )
      ) : (
        <>
          <TaskTable
            tasks={data.items}
            onRowClick={setOpenTaskId}
            onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
          />
          <Pagination
            page={data.page}
            total={data.total}
            pageSize={data.page_size}
            onPageChange={(p) => setFilter("page", String(p))}
          />
        </>
      )}

      {openTaskId && <TaskDetailDrawer taskId={openTaskId} onClose={() => setOpenTaskId(null)} />}
      {showForm && <TaskFormModal onClose={() => setShowForm(false)} />}
    </AppShell>
  );
}
