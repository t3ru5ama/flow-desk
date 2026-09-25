import { client } from "./client";
import type { AuditLog, Paginated } from "../types";

export interface AuditFilters {
  resource_type?: string;
  resource_id?: string;
  actor_id?: string;
  since?: string;
  page?: number;
  page_size?: number;
}

export async function listAuditLogs(filters: AuditFilters = {}): Promise<Paginated<AuditLog>> {
  return (await client.get("/api/audit", { params: filters })).data;
}
