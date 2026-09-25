import type { ApprovalStep } from "../../types";

const STEP_COLOR: Record<ApprovalStep["status"], string> = {
  pending: "bg-fd-khaki text-fd-taupe",
  approved: "bg-fd-success text-white",
  rejected: "bg-fd-error text-white",
  skipped: "bg-fd-khaki/50 text-fd-taupe",
};

export function ApprovalStepper({
  steps,
  currentStepOrder,
  compact,
}: {
  steps: ApprovalStep[];
  currentStepOrder: number;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center ${compact ? "gap-1" : "gap-3"}`}>
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1">
          <div
            className={`flex items-center justify-center rounded-full font-medium ${STEP_COLOR[step.status]} ${
              compact ? "h-5 w-5 text-[10px]" : "h-8 w-8 text-sm"
            } ${step.step_order === currentStepOrder && step.status === "pending" ? "ring-2 ring-fd-leather ring-offset-1" : ""}`}
            title={`Step ${step.step_order}: ${step.status}`}
          >
            {step.step_order}
          </div>
          {i < steps.length - 1 && <div className={`${compact ? "h-px w-3" : "h-px w-6"} bg-fd-khaki`} />}
        </div>
      ))}
    </div>
  );
}
