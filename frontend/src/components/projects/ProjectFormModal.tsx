import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as projectsApi from "../../api/projects";
import { Button } from "../ui/Button";
import { Input, Select, Textarea } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { PRIORITY_OPTIONS, PROJECT_STATUS_OPTIONS } from "../../lib/constants";
import { titleCase } from "../../lib/format";
import type { Project } from "../../types";

export function ProjectFormModal({ project, onClose }: { project?: Project; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<Project["status"]>(project?.status ?? "active");
  const [priority, setPriority] = useState<Project["priority"]>(project?.priority ?? "medium");
  const [startDate, setStartDate] = useState(project?.start_date ?? "");
  const [dueDate, setDueDate] = useState(project?.due_date ?? "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || null,
        status,
        priority,
        start_date: startDate || null,
        due_date: dueDate || null,
      };
      return project ? projectsApi.updateProject(project.id, payload) : projectsApi.createProject(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
    onError: () => setError("Couldn't save project. Due date must be on or after start date."),
  });

  return (
    <Modal title={project ? "Edit project" : "New project"} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        {error && <div className="rounded-md bg-fd-error/10 px-3 py-2 text-sm text-fd-error">{error}</div>}
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as Project["status"])}>
            {PROJECT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
          <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as Project["priority"])}>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {titleCase(p)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date" type="date" value={startDate ?? ""} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="Due date" type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {project ? "Save changes" : "Create project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
