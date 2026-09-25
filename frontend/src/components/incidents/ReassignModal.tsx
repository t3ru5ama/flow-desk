import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as incidentsApi from "../../api/incidents";
import * as teamApi from "../../api/team";
import { Button } from "../ui/Button";
import { Input, Select } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { useAuthStore } from "../../store/authStore";

export function ReassignModal({
  incidentId,
  currentUserId,
  currentTeam,
  onClose,
}: {
  incidentId: string;
  currentUserId: string | null;
  currentTeam: string | null;
  onClose: () => void;
}) {
  const org = useAuthStore((s) => s.org);
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState(currentUserId ?? "");
  const [team, setTeam] = useState(currentTeam ?? "");

  const members = useQuery({
    queryKey: ["members", org?.id],
    queryFn: () => teamApi.listMembers(org!.id),
    enabled: !!org,
  });

  const mutation = useMutation({
    mutationFn: () => incidentsApi.updateIncident(incidentId, { assigned_user_id: userId || null, assigned_team: team || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      onClose();
    },
  });

  return (
    <Modal title="Reassign incident" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <Select label="Assignee" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Unassigned</option>
          {members.data?.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.name}
            </option>
          ))}
        </Select>
        <Input label="Assigned team" value={team} onChange={(e) => setTeam(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
