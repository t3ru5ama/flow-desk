export type Role = "owner" | "admin" | "manager" | "member" | "viewer";

export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";
export type Priority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
export type Severity = "sev1" | "sev2" | "sev3" | "sev4";
export type IncidentStatus = "detected" | "investigating" | "mitigating" | "monitoring" | "resolved";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalStepStatus = "pending" | "approved" | "rejected" | "skipped";
export type IncidentEventType =
  | "created"
  | "status_changed"
  | "reassigned"
  | "comment_added"
  | "document_attached"
  | "task_linked";
export type NotificationType =
  | "task_assigned"
  | "incident_assigned"
  | "approval_requested"
  | "approval_decided"
  | "comment_added"
  | "team_invited"
  | "project_activity";
export type IntegrationProvider = "github" | "slack" | "google_drive" | "jira" | "pagerduty";
export type Plan = "free" | "starter" | "business" | "enterprise";

export const INCIDENT_STATUS_ORDER: IncidentStatus[] = [
  "detected",
  "investigating",
  "mitigating",
  "monitoring",
  "resolved",
];

export function getLegalNextStatuses(current?: IncidentStatus): IncidentStatus[] {
  if (!current) return [];
  const idx = INCIDENT_STATUS_ORDER.indexOf(current);
  return INCIDENT_STATUS_ORDER.slice(idx);
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Membership {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: Role;
  joined_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  owner_id: string;
  status: ProjectStatus;
  priority: Priority;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assignee_id: string | null;
  reporter_id: string;
  due_date: string | null;
  labels: Label[];
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface Incident {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  severity: Severity;
  status: IncidentStatus;
  assigned_team: string | null;
  assigned_user_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface IncidentEvent {
  id: string;
  event_type: IncidentEventType;
  actor_id: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ApprovalStep {
  id: string;
  step_order: number;
  status: ApprovalStepStatus;
  decided_by: string | null;
  decided_at: string | null;
  comment: string | null;
  approver_ids: string[];
}

export interface Approval {
  id: string;
  title: string;
  description: string | null;
  requester_id: string;
  status: ApprovalStatus;
  current_step_order: number;
  steps: ApprovalStep[];
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: string;
  project_id: string | null;
  incident_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface Integration {
  id: string;
  provider: IntegrationProvider;
  connected: boolean;
  config: Record<string, unknown> | null;
  connected_at: string | null;
}

export interface Subscription {
  plan: Plan;
  status: "active" | "past_due" | "canceled";
  user_limit: number;
  project_limit: number;
}

export interface Usage {
  users_used: number;
  user_limit: number;
  projects_used: number;
  project_limit: number;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiError {
  detail: string;
  code?: string;
  fields?: Record<string, string>;
}
