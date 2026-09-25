import type { IncidentStatus, Priority, ProjectStatus, Role, Severity, TaskStatus } from "../types";

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  viewer: "Viewer",
};

export const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  member: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

export function roleAtLeast(role: Role | null | undefined, min: Role): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = ["active", "on_hold", "completed", "archived"];
export const PRIORITY_OPTIONS: Priority[] = ["low", "medium", "high", "critical"];
export const TASK_STATUS_OPTIONS: TaskStatus[] = ["backlog", "todo", "in_progress", "review", "done"];
export const SEVERITY_OPTIONS: Severity[] = ["sev1", "sev2", "sev3", "sev4"];
export const INCIDENT_STATUS_OPTIONS: IncidentStatus[] = [
  "detected",
  "investigating",
  "mitigating",
  "monitoring",
  "resolved",
];

export const PRIORITY_BADGE: Record<Priority, "info" | "warning" | "error" | "default"> = {
  low: "default",
  medium: "info",
  high: "warning",
  critical: "error",
};

export const SEVERITY_BADGE: Record<Severity, "warning" | "error"> = {
  sev1: "error",
  sev2: "error",
  sev3: "warning",
  sev4: "warning",
};

export const TASK_STATUS_BADGE: Record<TaskStatus, "default" | "info" | "success"> = {
  backlog: "default",
  todo: "default",
  in_progress: "info",
  review: "info",
  done: "success",
};

export const INCIDENT_STATUS_BADGE: Record<IncidentStatus, "error" | "warning" | "success" | "info"> = {
  detected: "error",
  investigating: "warning",
  mitigating: "warning",
  monitoring: "info",
  resolved: "success",
};

export const PROJECT_STATUS_BADGE: Record<ProjectStatus, "success" | "warning" | "default" | "info"> = {
  active: "success",
  on_hold: "warning",
  completed: "info",
  archived: "default",
};
