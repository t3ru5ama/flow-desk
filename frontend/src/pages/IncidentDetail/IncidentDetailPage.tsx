import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import * as incidentsApi from "../../api/incidents";
import { AppShell } from "../../components/layout/AppShell";
import { IncidentDocumentsList } from "../../components/incidents/IncidentDocumentsList";
import { IncidentTimeline } from "../../components/incidents/IncidentTimeline";
import { ReassignModal } from "../../components/incidents/ReassignModal";
import { RelatedTasksList } from "../../components/incidents/RelatedTasksList";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Select, Textarea } from "../../components/ui/Input";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { INCIDENT_STATUS_BADGE, SEVERITY_BADGE } from "../../lib/constants";
import { relativeTime, titleCase } from "../../lib/format";
import { getLegalNextStatuses } from "../../types";
import type { IncidentStatus } from "../../types";

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [reassignOpen, setReassignOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const queryClient = useQueryClient();

  const { data: incident, isPending, isError, refetch } = useQuery({
    queryKey: ["incident", id],
    queryFn: () => incidentsApi.getIncident(id!),
    enabled: !!id,
  });
  const { data: events } = useQuery({
    queryKey: ["incident", id, "events"],
    queryFn: () => incidentsApi.listIncidentEvents(id!),
    enabled: !!id,
  });
  const { data: comments } = useQuery({
    queryKey: ["incident", id, "comments"],
    queryFn: () => incidentsApi.listIncidentComments(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: IncidentStatus) => incidentsApi.updateIncident(id!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", id] });
      queryClient.invalidateQueries({ queryKey: ["incident", id, "events"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => incidentsApi.addIncidentComment(id!, commentDraft),
    onSuccess: () => {
      setCommentDraft("");
      queryClient.invalidateQueries({ queryKey: ["incident", id, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["incident", id, "events"] });
    },
  });

  if (isPending) {
    return (
      <AppShell title="Incident">
        <LoadingState rows={6} />
      </AppShell>
    );
  }
  if (isError || !incident) {
    return (
      <AppShell title="Incident">
        <ErrorState message="Couldn't load incident." onRetry={refetch} />
      </AppShell>
    );
  }

  const nextStatusOptions = getLegalNextStatuses(incident.status);

  return (
    <AppShell title={incident.title}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="rounded-lg border border-fd-khaki bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2">
                <Badge variant={SEVERITY_BADGE[incident.severity]}>{incident.severity.toUpperCase()}</Badge>
                <Badge variant={INCIDENT_STATUS_BADGE[incident.status]}>{titleCase(incident.status)}</Badge>
              </div>
              <Select
                value={incident.status}
                onChange={(e) => statusMutation.mutate(e.target.value as IncidentStatus)}
                className="w-auto"
              >
                {nextStatusOptions.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </Select>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-fd-cacao">
              {incident.description || <span className="text-fd-taupe">No description.</span>}
            </p>
          </div>

          <div className="rounded-lg border border-fd-khaki bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-fd-cacao">Timeline</h3>
            <IncidentTimeline events={events ?? []} />
          </div>

          <div className="rounded-lg border border-fd-khaki bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-fd-cacao">Comments</h3>
            <div className="flex flex-col gap-3">
              {(comments ?? []).length === 0 && <p className="text-sm text-fd-taupe">No comments yet.</p>}
              {comments?.map((c) => (
                <div key={c.id} className="rounded-md border border-fd-khaki p-3">
                  <p className="text-sm text-fd-cacao">{c.body}</p>
                  <p className="mt-1 text-xs text-fd-taupe">{relativeTime(c.created_at)}</p>
                </div>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (commentDraft.trim()) commentMutation.mutate();
                }}
                className="flex flex-col gap-2"
              >
                <Textarea value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="Add a comment…" />
                <Button type="submit" disabled={!commentDraft.trim() || commentMutation.isPending} className="self-end">
                  Comment
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-fd-khaki bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-fd-cacao">Assignment</h3>
            <p className="text-sm text-fd-cacao">Team: {incident.assigned_team ?? "—"}</p>
            <p className="text-sm text-fd-cacao">Assignee: {incident.assigned_user_id ? "Assigned" : "Unassigned"}</p>
            <Button variant="secondary" className="mt-3 w-full" onClick={() => setReassignOpen(true)}>
              Reassign
            </Button>
          </div>
          <RelatedTasksList incidentId={incident.id} />
          <IncidentDocumentsList incidentId={incident.id} />
        </div>
      </div>

      {reassignOpen && (
        <ReassignModal
          incidentId={incident.id}
          currentUserId={incident.assigned_user_id}
          currentTeam={incident.assigned_team}
          onClose={() => setReassignOpen(false)}
        />
      )}
    </AppShell>
  );
}
