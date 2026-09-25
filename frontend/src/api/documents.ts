import { client } from "./client";
import type { Document, Paginated } from "../types";

export interface DocumentFilters {
  project_id?: string;
  incident_id?: string;
  page?: number;
}

export async function listDocuments(filters: DocumentFilters = {}): Promise<Paginated<Document>> {
  return (await client.get("/api/documents", { params: filters })).data;
}

export async function uploadDocument(
  file: File,
  opts: { project_id?: string; incident_id?: string } = {},
): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  if (opts.project_id) form.append("project_id", opts.project_id);
  if (opts.incident_id) form.append("incident_id", opts.incident_id);
  return (await client.post("/api/documents", form, { headers: { "Content-Type": "multipart/form-data" } })).data;
}

export async function downloadDocument(id: string, filename: string): Promise<void> {
  const res = await client.get(`/api/documents/${id}/download`, { responseType: "blob" });
  const url = window.URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function deleteDocument(id: string): Promise<void> {
  await client.delete(`/api/documents/${id}`);
}
