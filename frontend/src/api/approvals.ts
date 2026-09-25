import { client } from "./client";
import type { Approval, ApprovalStatus, Paginated } from "../types";

export interface ApprovalFilters {
  status?: ApprovalStatus;
  filter?: "mine" | "requested" | "all";
  page?: number;
}

export async function listApprovals(filters: ApprovalFilters = {}): Promise<Paginated<Approval>> {
  return (await client.get("/api/approvals", { params: filters })).data;
}

export async function getApproval(id: string): Promise<Approval> {
  return (await client.get(`/api/approvals/${id}`)).data;
}

export async function createApproval(data: {
  title: string;
  description?: string;
  steps: { approver_ids: string[] }[];
}): Promise<Approval> {
  return (await client.post("/api/approvals", data)).data;
}

export async function decideStep(
  approvalId: string,
  stepId: string,
  decision: "approved" | "rejected",
  comment?: string,
): Promise<Approval> {
  return (await client.post(`/api/approvals/${approvalId}/steps/${stepId}/decide`, { decision, comment })).data;
}
