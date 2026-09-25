import { client } from "./client";
import type { Comment, Paginated, Priority, Task, TaskStatus } from "../types";

export interface TaskFilters {
  project_id?: string;
  status?: TaskStatus;
  priority?: Priority;
  assignee_id?: string;
  search?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

export async function listTasks(filters: TaskFilters = {}): Promise<Paginated<Task>> {
  return (await client.get("/api/tasks", { params: filters })).data;
}

export async function getTask(id: string): Promise<Task> {
  return (await client.get(`/api/tasks/${id}`)).data;
}

export async function createTask(data: Partial<Task> & { label_ids?: string[] }): Promise<Task> {
  return (await client.post("/api/tasks", data)).data;
}

export async function updateTask(id: string, data: Partial<Task> & { label_ids?: string[] }): Promise<Task> {
  return (await client.patch(`/api/tasks/${id}`, data)).data;
}

export async function deleteTask(id: string): Promise<void> {
  await client.delete(`/api/tasks/${id}`);
}

export async function listTaskComments(id: string): Promise<Comment[]> {
  return (await client.get(`/api/tasks/${id}/comments`)).data;
}

export async function addTaskComment(id: string, body: string): Promise<Comment> {
  return (await client.post(`/api/tasks/${id}/comments`, { body })).data;
}
