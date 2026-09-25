import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as approvalsApi from "../../api/approvals";
import * as teamApi from "../../api/team";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { useAuthStore } from "../../store/authStore";

interface StepDraft {
  approverIds: string[];
}

export function ApprovalCreateModal({ onClose }: { onClose: () => void }) {
  const org = useAuthStore((s) => s.org);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([{ approverIds: [] }]);
  const [error, setError] = useState<string | null>(null);

  const members = useQuery({
    queryKey: ["members", org?.id],
    queryFn: () => teamApi.listMembers(org!.id),
    enabled: !!org,
  });

  const mutation = useMutation({
    mutationFn: () =>
      approvalsApi.createApproval({
        title,
        description: description || undefined,
        steps: steps.map((s) => ({ approver_ids: s.approverIds })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      onClose();
    },
    onError: () => setError("Couldn't create approval. Every step needs at least one approver."),
  });

  function toggleApprover(stepIndex: number, userId: string) {
    setSteps((prev) =>
      prev.map((s, i) =>
        i !== stepIndex
          ? s
          : { approverIds: s.approverIds.includes(userId) ? s.approverIds.filter((id) => id !== userId) : [...s.approverIds, userId] },
      ),
    );
  }

  const canSubmit = title.trim() && steps.every((s) => s.approverIds.length > 0);

  return (
    <Modal title="New approval request" onClose={onClose} wide>
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

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-fd-cacao">Steps</span>
          {steps.map((step, i) => (
            <div key={i} className="rounded-md border border-fd-khaki p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-fd-cacao">Step {i + 1}</span>
                {steps.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-fd-taupe hover:text-fd-error"
                    onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {members.data?.map((m) => (
                  <label
                    key={m.user_id}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors duration-150 ${
                      step.approverIds.includes(m.user_id)
                        ? "border-fd-leather bg-fd-leather text-white"
                        : "border-fd-khaki text-fd-cacao hover:bg-fd-pearl"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={step.approverIds.includes(m.user_id)}
                      onChange={() => toggleApprover(i, m.user_id)}
                    />
                    {m.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => setSteps((prev) => [...prev, { approverIds: [] }])}>
            Add step
          </Button>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || mutation.isPending}>
            Create approval
          </Button>
        </div>
      </form>
    </Modal>
  );
}
