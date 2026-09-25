import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as projectsApi from "../../api/projects";
import * as teamApi from "../../api/team";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Select } from "../ui/Input";
import { LoadingState } from "../ui/States";
import { useAuthStore } from "../../store/authStore";

export function ProjectMembersList({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const org = useAuthStore((s) => s.org);
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState("");

  const { data: members, isPending } = useQuery({
    queryKey: ["project", projectId, "members"],
    queryFn: () => projectsApi.listProjectMembers(projectId),
  });
  const { data: orgMembers } = useQuery({
    queryKey: ["members", org?.id],
    queryFn: () => teamApi.listMembers(org!.id),
    enabled: !!org && canEdit,
  });

  const addMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.addProjectMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "members"] });
      setSelectedUser("");
    },
  });
  const removeMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.removeProjectMember(projectId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId, "members"] }),
  });

  if (isPending) return <LoadingState rows={3} />;

  const availableToAdd = orgMembers?.filter((m) => !members?.some((pm) => pm.user_id === m.user_id)) ?? [];

  return (
    <div className="flex flex-col gap-3">
      {members?.map((m) => (
        <div key={m.user_id} className="flex items-center justify-between rounded-md border border-fd-khaki p-3">
          <div className="flex items-center gap-3">
            <Avatar name={m.name} />
            <div>
              <p className="text-sm font-medium text-fd-cacao">{m.name}</p>
              <p className="text-xs text-fd-taupe">{m.email}</p>
            </div>
          </div>
          {canEdit && (
            <Button variant="ghost" onClick={() => removeMutation.mutate(m.user_id)}>
              Remove
            </Button>
          )}
        </div>
      ))}
      {canEdit && (
        <div className="flex gap-2">
          <Select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="flex-1">
            <option value="">Add a member…</option>
            {availableToAdd.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Button disabled={!selectedUser} onClick={() => addMutation.mutate(selectedUser)}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
