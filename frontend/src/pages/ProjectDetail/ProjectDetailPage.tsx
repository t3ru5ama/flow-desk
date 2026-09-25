import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import * as projectsApi from "../../api/projects";
import * as tasksApi from "../../api/tasks";
import { ActivityFeed } from "../../components/activity/ActivityFeed";
import { AppShell } from "../../components/layout/AppShell";
import { ProjectFormModal } from "../../components/projects/ProjectFormModal";
import { ProjectMembersList } from "../../components/projects/ProjectMembersList";
import { TaskDetailDrawer } from "../../components/tasks/TaskDetailDrawer";
import { TaskFormModal } from "../../components/tasks/TaskFormModal";
import { TaskTable } from "../../components/tasks/TaskTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Tabs } from "../../components/ui/Tabs";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { PRIORITY_BADGE, PROJECT_STATUS_BADGE, roleAtLeast } from "../../lib/constants";
import { formatDate, titleCase } from "../../lib/format";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<"overview" | "tasks" | "members" | "activity">("overview");
  const [showEdit, setShowEdit] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const role = useAuthStore((s) => s.role);
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);
  const canManage = roleAtLeast(role, "manager");

  const { data: project, isPending, isError, refetch } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.getProject(id!),
    enabled: !!id,
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks", { project_id: id }],
    queryFn: () => tasksApi.listTasks({ project_id: id }),
    enabled: !!id && tab === "tasks",
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      tasksApi.updateTask(taskId, { status: status as never }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => projectsApi.archiveProject(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      addToast("Project archived");
    },
  });

  if (isPending) {
    return (
      <AppShell title="Project">
        <LoadingState rows={6} />
      </AppShell>
    );
  }
  if (isError || !project) {
    return (
      <AppShell title="Project">
        <ErrorState message="Couldn't load project." onRetry={refetch} />
      </AppShell>
    );
  }

  return (
    <AppShell title={project.name}>
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={PROJECT_STATUS_BADGE[project.status]}>{titleCase(project.status)}</Badge>
          <Badge variant={PRIORITY_BADGE[project.priority]}>{titleCase(project.priority)}</Badge>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowEdit(true)}>
              Edit
            </Button>
            {project.status !== "archived" && (
              <Button variant="danger" onClick={() => archiveMutation.mutate()}>
                Archive
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "tasks", label: "Tasks" },
          { key: "members", label: "Members" },
          { key: "activity", label: "Activity" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-4">
        {tab === "overview" && (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-fd-cacao">{project.description || <span className="text-fd-taupe">No description.</span>}</p>
            <div className="flex gap-6 text-fd-taupe">
              <span>Start: {formatDate(project.start_date)}</span>
              <span>Due: {formatDate(project.due_date)}</span>
            </div>
          </div>
        )}
        {tab === "tasks" && (
          <>
            {canManage && (
              <div className="mb-3 flex justify-end">
                <Button onClick={() => setShowTaskForm(true)}>Add task</Button>
              </div>
            )}
            {tasks && tasks.items.length > 0 ? (
              <TaskTable
                tasks={tasks.items}
                onRowClick={setOpenTaskId}
                onStatusChange={(taskId, status) => statusMutation.mutate({ taskId, status })}
              />
            ) : (
              <p className="text-sm text-fd-taupe">No tasks in this project yet.</p>
            )}
          </>
        )}
        {tab === "members" && <ProjectMembersList projectId={project.id} canEdit={canManage} />}
        {tab === "activity" && <ActivityFeed resourceType="project" resourceId={project.id} />}
      </div>

      {showEdit && <ProjectFormModal project={project} onClose={() => setShowEdit(false)} />}
      {showTaskForm && <TaskFormModal defaultProjectId={project.id} onClose={() => setShowTaskForm(false)} />}
      {openTaskId && <TaskDetailDrawer taskId={openTaskId} onClose={() => setOpenTaskId(null)} />}
    </AppShell>
  );
}
