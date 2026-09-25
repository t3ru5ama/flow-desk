import { client } from "./client";
import type { Notification, Paginated } from "../types";

export interface NotificationFilters {
  unread?: boolean;
  page?: number;
  page_size?: number;
}

export async function listNotifications(filters: NotificationFilters = {}): Promise<Paginated<Notification>> {
  return (await client.get("/api/notifications", { params: filters })).data;
}

export async function unreadCount(): Promise<number> {
  return (await client.get("/api/notifications/unread-count")).data.unread_count;
}

export async function markRead(id: string): Promise<void> {
  await client.patch(`/api/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  await client.patch("/api/notifications/read-all");
}
