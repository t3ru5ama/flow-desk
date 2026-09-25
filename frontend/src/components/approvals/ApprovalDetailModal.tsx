import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as approvalsApi from "../../api/approvals";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { ErrorState, LoadingState } from "../ui/States";
import { roleAtLeast } from "../../lib/constants";
import { relativeTime, titleCase } from "../../lib/format";
import { useAuthStore } from "../../store/authStore";
import { ApprovalStepper } from "./ApprovalStepper";

const STATUS_BADGE = { pending: "warning", approved: "success", rejected: "error", skipped: "default" } as const;

export function ApprovalDetailModal({ approvalId, onClose }: { approvalId: string; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const queryClient = useQueryClient();
  const [decisionComment, setDecisionComment] = useState("");

  const { data: approval, isPending, isError, refetch } = useQuery({
    queryKey: ["approval", approvalId],
    queryFn: () => approvalsApi.getApproval(approvalId),
  });

  const decideMutation = useMutation({
    mutationFn: (decision: "approved" | "rejected") =>
      approvalsApi.decideStep(approvalId, activeStep!.id, decision, decisionComment || undefined),
    onSuccess: () => {
      setDecisionComment("");
      queryClient.invalidateQueries({ queryKey: ["approval", approvalId] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });

  if (isPending) {
    return (
      <Modal title="Approval" onClose={onClose} wide>
        <LoadingState rows={4} />
      </Modal>
    );
  }
  if (isError || !approval) {
    return (
      <Modal title="Approval" onClose={onClose} wide>
        <ErrorState message="Couldn't load approval." onRetry={refetch} />
      </Modal>
    );
  }

  const activeStep = approval.steps.find((s) => s.step_order === approval.current_step_order && s.status === "pending");
  const canDecide = !!activeStep && !!user && activeStep.approver_ids.includes(user.id) && roleAtLeast(role, "manager");

  return (
    <Modal title={approval.title} onClose={onClose} wide>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Badge variant={STATUS_BADGE[approval.status]}>{titleCase(approval.status)}</Badge>
          <ApprovalStepper steps={approval.steps} currentStepOrder={approval.current_step_order} />
        </div>
        {approval.description && <p className="text-sm text-fd-cacao">{approval.description}</p>}

        <div className="flex flex-col gap-3">
          {approval.steps.map((step) => (
            <div key={step.id} className="rounded-md border border-fd-khaki p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-fd-cacao">Step {step.step_order}</span>
                <Badge variant={STATUS_BADGE[step.status]}>{titleCase(step.status)}</Badge>
              </div>
              {step.decided_by && (
                <p className="mt-1 text-xs text-fd-taupe">
                  Decided {step.decided_at && relativeTime(step.decided_at)}
                  {step.comment && ` — "${step.comment}"`}
                </p>
              )}
            </div>
          ))}
        </div>

        {canDecide && (
          <div className="flex flex-col gap-2 rounded-md border border-fd-khaki p-3">
            <Textarea
              label="Comment (required to reject)"
              value={decisionComment}
              onChange={(e) => setDecisionComment(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="danger"
                disabled={!decisionComment.trim() || decideMutation.isPending}
                onClick={() => decideMutation.mutate("rejected")}
              >
                Reject
              </Button>
              <Button disabled={decideMutation.isPending} onClick={() => decideMutation.mutate("approved")}>
                Approve
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
