import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApprovalStepper } from "./ApprovalStepper";
import type { ApprovalStep } from "../../types";

const steps: ApprovalStep[] = [
  { id: "s1", step_order: 1, status: "approved", decided_by: "u1", decided_at: "2026-01-01T00:00:00Z", comment: null, approver_ids: ["u1"] },
  { id: "s2", step_order: 2, status: "pending", decided_by: null, decided_at: null, comment: null, approver_ids: ["u2"] },
];

describe("ApprovalStepper", () => {
  it("renders one marker per step", () => {
    render(<ApprovalStepper steps={steps} currentStepOrder={2} />);
    expect(screen.getByTitle("Step 1: approved")).toBeInTheDocument();
    expect(screen.getByTitle("Step 2: pending")).toBeInTheDocument();
  });

  it("highlights the current active step with a ring", () => {
    render(<ApprovalStepper steps={steps} currentStepOrder={2} />);
    expect(screen.getByTitle("Step 2: pending").className).toContain("ring-2");
    expect(screen.getByTitle("Step 1: approved").className).not.toContain("ring-2");
  });
});
