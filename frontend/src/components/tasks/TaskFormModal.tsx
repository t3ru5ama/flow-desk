import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as tasksApi from "../../api/tasks";
import * as projectsApi from "../../api/projects";
import * as teamApi from "../../api/team";
import { Button } from "../ui/Button";
import { Input, Select, Textarea } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "../../lib/constants";
import { titleCase } from "../../lib/format";
import { useAuthStore } from "../../store/authStore";
import type { Task } from "../../types";

export function TaskFormModal({
  task,
  defaultProjectId,
  onClose,
}: {
  task?: Task;
  defaultProjectId?: string;
  onClose: () => void;
}) {
  const org = useAuthStore((s) => s.org);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<Task["status"]>(task?.status ?? "backlog");
  const [priority, setPriority] = useState<Task["priority"]>(task?.priority ?? "medium");
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [projectId, setProjectId] = useState(task?.project_id ?? defaultProjectId ?? "");
  const [error, setError] = useState<string | null>(null);

  const members = useQuery({
    queryKey: ["members", org?.id],
    queryFn: () => teamApi.listMembers(org!.id),
    enabled: !!org,
  });
  const projects = useQuery({ queryKey: ["projects", "minimal"], queryFn: () => projectsApi.listProjects({}) });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        title,
        description: description || null,
        status,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        project_id: projectId || null,
      };
      return task ? tasksApi.updateTask(task.id, payload) : tasksApi.createTask(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
    onError: () => setError("Couldn't save task. Check the fields and try again."),
  });

  return (
    <Modal title={task ? "Edit task" : "New task"} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        {error && <div className="rounded-md bg-fd-error/10 px-3 py-2 text-sm text-fd-error">{error}</div>}
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={255} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as Task["status"])}>
            {TASK_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
          <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])}>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {titleCase(p)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Unassigned</option>
            {members.data?.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Input label="Due date" type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        {!defaultProjectId && (
          <Select label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!!task}>
            <option value="">No project</option>
            {projects.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {task ? "Save changes" : "Create task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
