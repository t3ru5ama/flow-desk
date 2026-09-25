import { Badge } from "../ui/Badge";
import { PRIORITY_BADGE, TASK_STATUS_OPTIONS } from "../../lib/constants";
import { formatDate, titleCase } from "../../lib/format";
import type { Task } from "../../types";

export function TaskTable({
  tasks,
  onRowClick,
  onStatusChange,
}: {
  tasks: Task[];
  onRowClick: (taskId: string) => void;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-fd-khaki bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-fd-khaki bg-fd-pearl text-xs uppercase text-fd-taupe">
          <tr>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Priority</th>
            <th className="px-4 py-3 font-medium">Labels</th>
            <th className="px-4 py-3 font-medium">Due</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b border-fd-khaki last:border-0 hover:bg-fd-pearl/60">
              <td className="cursor-pointer px-4 py-3 text-fd-cacao" onClick={() => onRowClick(task.id)}>
                {task.title}
              </td>
              <td className="px-4 py-3">
                <select
                  value={task.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onStatusChange(task.id, e.target.value as Task["status"])}
                  className="rounded-md border border-fd-khaki bg-white px-2 py-1 text-xs"
                >
                  {TASK_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {titleCase(s)}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <Badge variant={PRIORITY_BADGE[task.priority]}>{titleCase(task.priority)}</Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {task.labels.map((l) => (
                    <span key={l.id} className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: `${l.color}20`, color: l.color }}>
                      {l.name}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-fd-taupe">{formatDate(task.due_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
