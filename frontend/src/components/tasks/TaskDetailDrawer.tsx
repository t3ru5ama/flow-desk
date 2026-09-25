import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as tasksApi from "../../api/tasks";
import { ActivityFeed } from "../activity/ActivityFeed";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Modal";
import { Tabs } from "../ui/Tabs";
import { Textarea } from "../ui/Input";
import { ErrorState, LoadingState } from "../ui/States";
import { PRIORITY_BADGE, TASK_STATUS_BADGE } from "../../lib/constants";
import { relativeTime, titleCase } from "../../lib/format";
import { useUiStore } from "../../store/uiStore";

export function TaskDetailDrawer({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const [tab, setTab] = useState<"details" | "comments" | "activity">("details");
  const [draft, setDraft] = useState("");
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  const { data: task, isPending, isError, refetch } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => tasksApi.getTask(taskId),
  });
  const { data: comments } = useQuery({
    queryKey: ["task", taskId, "comments"],
    queryFn: () => tasksApi.listTaskComments(taskId),
    enabled: tab === "comments",
  });

  const commentMutation = useMutation({
    mutationFn: () => tasksApi.addTaskComment(taskId, draft),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["task", taskId, "comments"] });
      addToast("Comment added");
    },
  });

  return (
    <Drawer title={task?.title ?? "Task"} onClose={onClose}>
      {isPending ? (
        <LoadingState rows={4} />
      ) : isError || !task ? (
        <ErrorState message="Couldn't load task." onRetry={refetch} />
      ) : (
        <>
          <div className="mb-4 flex gap-2">
            <Badge variant={TASK_STATUS_BADGE[task.status]}>{titleCase(task.status)}</Badge>
            <Badge variant={PRIORITY_BADGE[task.priority]}>{titleCase(task.priority)}</Badge>
          </div>
          <Tabs
            tabs={[
              { key: "details", label: "Details" },
              { key: "comments", label: "Comments" },
              { key: "activity", label: "Activity" },
            ]}
            active={tab}
            onChange={setTab}
          />
          <div className="mt-4">
            {tab === "details" && (
              <p className="whitespace-pre-wrap text-sm text-fd-cacao">
                {task.description || <span className="text-fd-taupe">No description.</span>}
              </p>
            )}
            {tab === "comments" && (
              <div className="flex flex-col gap-3">
                {comments?.length === 0 && <p className="text-sm text-fd-taupe">No comments yet.</p>}
                {comments?.map((c) => (
                  <div key={c.id} className="rounded-md border border-fd-khaki p-3">
                    <p className="text-sm text-fd-cacao">{c.body}</p>
                    <p className="mt-1 text-xs text-fd-taupe">{relativeTime(c.created_at)}</p>
                  </div>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (draft.trim()) commentMutation.mutate();
                  }}
                  className="flex flex-col gap-2"
                >
                  <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment…" />
                  <Button type="submit" disabled={!draft.trim() || commentMutation.isPending} className="self-end">
                    Comment
                  </Button>
                </form>
              </div>
            )}
            {tab === "activity" && <ActivityFeed resourceType="task" resourceId={taskId} />}
          </div>
        </>
      )}
    </Drawer>
  );
}
