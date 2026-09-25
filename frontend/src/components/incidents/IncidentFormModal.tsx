import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as incidentsApi from "../../api/incidents";
import { Button } from "../ui/Button";
import { Input, Select, Textarea } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { SEVERITY_OPTIONS } from "../../lib/constants";
import type { Severity } from "../../types";

export function IncidentFormModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("sev3");
  const [assignedTeam, setAssignedTeam] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => incidentsApi.createIncident({ title, description: description || null, severity, assigned_team: assignedTeam || null }),
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      onClose();
      navigate(`/incidents/${incident.id}`);
    },
    onError: () => setError("Couldn't create incident. Check the fields and try again."),
  });

  return (
    <Modal title="New incident" onClose={onClose}>
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
        <Select label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.toUpperCase()}
            </option>
          ))}
        </Select>
        <Input label="Assigned team" value={assignedTeam} onChange={(e) => setAssignedTeam(e.target.value)} placeholder="e.g. Engineering" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            Create incident
          </Button>
        </div>
      </form>
    </Modal>
  );
}
