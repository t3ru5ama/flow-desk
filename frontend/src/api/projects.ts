import { client } from "./client";
import type { Paginated, Project, ProjectStatus, Priority } from "../types";

export interface ProjectFilters {
  status?: ProjectStatus;
  priority?: Priority;
  page?: number;
}

export async function listProjects(filters: ProjectFilters = {}): Promise<Paginated<Project>> {
  return (await client.get("/api/projects", { params: filters })).data;
}

export async function getProject(id: string): Promise<Project> {
  return (await client.get(`/api/projects/${id}`)).data;
}

export async function createProject(data: Partial<Project>): Promise<Project> {
  return (await client.post("/api/projects", data)).data;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  return (await client.patch(`/api/projects/${id}`, data)).data;
}

export async function archiveProject(id: string): Promise<Project> {
  return (await client.delete(`/api/projects/${id}`)).data;
}

export async function addProjectMember(id: string, userId: string): Promise<void> {
  await client.post(`/api/projects/${id}/members`, { user_id: userId });
}

export async function removeProjectMember(id: string, userId: string): Promise<void> {
  await client.delete(`/api/projects/${id}/members/${userId}`);
}

export async function listProjectMembers(id: string): Promise<{ user_id: string; name: string; email: string }[]> {
  return (await client.get(`/api/projects/${id}/members`)).data;
}
