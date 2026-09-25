import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as incidentsApi from "../../api/incidents";
import * as tasksApi from "../../api/tasks";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Select } from "../ui/Input";
import { LoadingState } from "../ui/States";
import { PRIORITY_BADGE } from "../../lib/constants";
import { titleCase } from "../../lib/format";

export function RelatedTasksList({ incidentId }: { incidentId: string }) {
  const [linking, setLinking] = useState(false);
  const [taskId, setTaskId] = useState("");
  const queryClient = useQueryClient();

  const { data: linked, isPending } = useQuery({
    queryKey: ["incident", incidentId, "tasks"],
    queryFn: () => incidentsApi.listLinkedTasks(incidentId),
  });
  const allTasks = useQuery({
    queryKey: ["tasks", "all-for-linking"],
    queryFn: () => tasksApi.listTasks({ page_size: 100 }),
    enabled: linking,
  });

  const mutation = useMutation({
    mutationFn: () => incidentsApi.linkIncidentTask(incidentId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId, "tasks"] });
      setLinking(false);
      setTaskId("");
    },
  });

  const availableTasks = allTasks.data?.items.filter((t) => !linked?.some((l) => l.id === t.id)) ?? [];

  return (
    <div className="rounded-lg border border-fd-khaki bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fd-cacao">Related tasks</h3>
        <Button variant="ghost" onClick={() => setLinking((v) => !v)}>
          {linking ? "Cancel" : "Link task"}
        </Button>
      </div>
      {linking && (
        <div className="mb-3 flex gap-2">
          <Select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="flex-1">
            <option value="">Select a task…</option>
            {availableTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
          <Button disabled={!taskId} onClick={() => mutation.mutate()}>
            Link
          </Button>
        </div>
      )}
      {isPending ? (
        <LoadingState rows={2} />
      ) : linked && linked.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {linked.map((t) => (
            <li key={t.id} className="flex items-center justify-between text-sm">
              <span className="text-fd-cacao">{t.title}</span>
              <Badge variant={PRIORITY_BADGE[t.priority]}>{titleCase(t.priority)}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-fd-taupe">No tasks linked.</p>
      )}
    </div>
  );
}
