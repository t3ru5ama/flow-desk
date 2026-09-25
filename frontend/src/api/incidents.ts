import { client } from "./client";
import type { Comment, Document, Incident, IncidentEvent, IncidentStatus, Paginated, Severity, Task } from "../types";

export interface IncidentFilters {
  severity?: Severity;
  status?: IncidentStatus;
  assigned_team?: string;
  page?: number;
}

export async function listIncidents(filters: IncidentFilters = {}): Promise<Paginated<Incident>> {
  return (await client.get("/api/incidents", { params: filters })).data;
}

export async function getIncident(id: string): Promise<Incident> {
  return (await client.get(`/api/incidents/${id}`)).data;
}

export async function createIncident(data: Partial<Incident>): Promise<Incident> {
  return (await client.post("/api/incidents", data)).data;
}

export async function updateIncident(id: string, data: Partial<Incident>): Promise<Incident> {
  return (await client.patch(`/api/incidents/${id}`, data)).data;
}

export async function listIncidentEvents(id: string): Promise<IncidentEvent[]> {
  return (await client.get(`/api/incidents/${id}/events`)).data;
}

export async function listIncidentComments(id: string): Promise<Comment[]> {
  return (await client.get(`/api/incidents/${id}/comments`)).data;
}

export async function addIncidentComment(id: string, body: string): Promise<Comment> {
  return (await client.post(`/api/incidents/${id}/comments`, { body })).data;
}

export async function linkIncidentTask(id: string, taskId: string): Promise<void> {
  await client.post(`/api/incidents/${id}/tasks`, { task_id: taskId });
}

export async function listLinkedTasks(id: string): Promise<Task[]> {
  return (await client.get(`/api/incidents/${id}/tasks`)).data;
}

export async function listIncidentDocuments(id: string): Promise<Paginated<Document>> {
  return (await client.get(`/api/incidents/${id}/documents`)).data;
}
