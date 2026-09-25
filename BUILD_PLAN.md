# FlowDesk — BUILD_PLAN.md
## Long-Term Engineering Specification & Implementation Blueprint

This document is the single source of truth for building FlowDesk. A fresh Claude
session given only this file must be able to say "Continue implementation from
BUILD_PLAN.md" and immediately know what to build, how it should look, how the
backend/database/API work, and what step comes next. Do not re-ask the user to
explain the project — everything needed is here.

---

## 0. LOCKED SPECIFICATION (do not deviate, do not ask)

```
FLOWDESK

Frontend:      React + TypeScript + Vite + Tailwind CSS
Backend:       Python + FastAPI + Pydantic
ORM:           SQLAlchemy
Migrations:    Alembic
Database:      MySQL (database name: flowdesk)
Auth:          JWT access token + refresh token, RBAC
Storage:       Local filesystem, behind a storage abstraction
Testing:       Pytest (backend), Vitest + React Testing Library (frontend)
Development:   Local-first, Docker optional (MySQL only)
UI palette:    White / Pearl / Khaki / Taupe / Cacao / Leather (warm neutral)
```

**Do NOT use Node.js/Express.** An earlier draft mentioned it; that is superseded.
**Do NOT use a dark navy/cyan palette.** An earlier draft mentioned it; that is superseded.
This specification is final unless the user explicitly instructs otherwise.

### 0.1 Paths and ports (locked)

```
fantom.ai (existing, READ-ONLY, never modify):
  Location:  C:\Users\Sharrvin\OneDrive\Documents\GitHub\fantom.ai
  Stack:     Python/FastAPI backend only (no frontend exists in that repo)
  Database:  Postgres, port 5432, Docker container "fantom-db"
  Cache:     Redis, port 6379, Docker container "fantom-redis"
  API port:  localhost:8000
  → No overlap risk with FlowDesk: different DB engine, different containers,
    different ports. Never touch this repo's files, .env, containers, or ports.

FlowDesk (new, this project):
  Location:       C:\Users\Sharrvin\OneDrive\Documents\GitHub\flowdesk
  Backend port:    8001
  Frontend port:   5173
  MySQL port:      3306 (shared MySQL server instance is fine — separate DATABASE)
  MySQL database:  flowdesk
  MySQL creds:     user=root, password=<blank> (local XAMPP default) — read from
                   env, never hardcoded; if a different local MySQL setup is
                   found during Phase 0 inspection, adapt DB_HOST/USER/PASSWORD
                   accordingly and note it in BUILD STATE > KNOWN ISSUES.
```

Before starting any service, run a quick port-availability check (Phase 0). If
8001, 5173, or 3306 are already bound by something unrelated to FlowDesk or
fantom.ai, pick the next free port and update `.env` + this document's port
table, do not fight for the port.

---

## 1. PRODUCT ARCHITECTURE

FlowDesk is a B2B SaaS platform combining project management, task tracking,
incident management, and approval workflows for a single organization (multi-org
capable at the data-model level, single-org UX for v1). It should read as a
realistic enterprise tool, not a CRUD toy — information-dense tables, real
filters, real permission boundaries, real activity history.

**Core domain objects:** Organization → Memberships (Users with a Role) →
Projects → Tasks; Incidents (org-wide, optionally linked to a Project/Tasks);
Approvals (org-wide, multi-step); Documents (attached to Projects or Incidents);
Notifications (per-user); AuditLogs (org-wide, append-only).

**Example seed organization:** Acme Technologies, departments Engineering,
Security, Finance, Operations (departments are descriptive only in v1 — not a
separate DB table, just seed-data flavor via project naming/team labels).

---

## 2. LOCKED DESIGN SYSTEM

### 2.1 Colour tokens (hex exact)

```
White    #FFFFFF  → primary background, clean surfaces
Pearl    #FAF8F5  → secondary background, page canvas, card backgrounds
Khaki    #DFDACF  → subtle supporting surfaces, dividers, hover backgrounds
Taupe    #A3968D  → borders, muted/secondary text, disabled states
Cacao    #4D403A  → primary text, headers, deep surfaces
Leather  #262626  → primary accent, CTA buttons, active nav, sidebar background

Semantic (muted, warm-compatible, still accessible-contrast):
Success  #6B8E5A
Warning  #B08D57
Error    #A3453A
Info     #6B7A8F
```

### 2.2 Application of tokens

- **Page background:** Pearl (`#FAF8F5`).
- **Cards / panels:** White (`#FFFFFF`) on Pearl background, 1px Taupe-tinted border (`#DFDACF` or `#A3968D` at low opacity).
- **Sidebar / top nav:** Leather (`#262626`) background, White/Pearl text, active item gets a Leather-on-lighter-Leather highlight or a thin accent underline in a lighter tint (e.g. `#3A3A3A` hover state).
- **Primary buttons / CTAs / active nav / links:** Leather (`#262626`) background, White text. Consistent everywhere — do not mix Leather and Cacao for the same role.
- **Headings / primary text:** Cacao (`#4D403A`).
- **Secondary / muted text (labels, timestamps, helper text):** Taupe (`#A3968D`).
- **Dividers / input borders:** Khaki (`#DFDACF`).
- **Status badges (task priority, incident severity, approval state):** use the semantic colours above at ~15% background tint + full-strength text/icon, e.g. Error badge = `#A3453A` text on `#A3453A` at 10% opacity background.
- Tailwind config exposes these as custom colours: `bg-fd-pearl`, `text-fd-cacao`, `bg-fd-leather`, etc. (`fd` prefix = FlowDesk, avoids clashing with Tailwind's built-in palette names).
- Visual direction: warm, premium, refined, editorial-professional B2B SaaS — not generic blue SaaS. Clean, information-dense, minimal shadow use (prefer 1px borders over drop shadows), no gradients, no unnecessary motion (only fast 150ms transitions on hover/focus).

### 2.3 Typography & spacing (conventional defaults, not over-specified)

- System font stack or Inter (via Tailwind default `font-sans`) for UI; no custom font loading required for v1.
- Base spacing scale = Tailwind default (4px increments). Base text size 14px for dense tables, 16px for body copy, standard Tailwind `text-sm`/`text-base`/`text-lg`/`text-xl` scale for hierarchy.

---

## 3. FRONTEND ARCHITECTURE

### 3.1 Folder structure

```
flowdesk/frontend/
  src/
    api/                # typed API client functions, one file per domain
      client.ts          # base axios/fetch instance, interceptors (auth header, 401 refresh)
      auth.ts
      projects.ts
      tasks.ts
      incidents.ts
      approvals.ts
      documents.ts
      notifications.ts
      team.ts
      integrations.ts
      billing.ts
      audit.ts
    components/
      ui/                # generic reusable primitives: Button, Input, Select, Modal,
                          # Drawer, Table, Badge, Card, Tabs, Toast, EmptyState,
                          # ErrorState, LoadingSpinner, Avatar, Pagination
      layout/             # Sidebar, TopBar, AppShell, ProtectedRoute
      projects/           # ProjectCard, ProjectForm, ProjectMembersList
      tasks/              # TaskTable, TaskForm, TaskCard, StatusBadge, PriorityBadge
      incidents/          # IncidentTimeline, SeverityBadge, IncidentForm
      approvals/          # ApprovalStepper, ApprovalStepCard
      documents/          # DocumentUploader, DocumentList
      notifications/      # NotificationBell, NotificationList
    pages/               # one folder per route, matches section 6 below
      Landing/
      Login/
      Signup/
      Dashboard/
      Projects/
      ProjectDetail/
      Tasks/
      Incidents/
      IncidentDetail/
      Approvals/
      Documents/
      Notifications/
      Team/
      Integrations/
      Billing/
      Settings/
      Profile/
    hooks/               # useAuth, useOrg, useDebounce, usePagination
    store/               # Zustand stores: authStore, orgStore, uiStore (toasts/modals)
    lib/                 # queryClient setup (TanStack Query), constants, formatters
    types/               # shared TS types mirroring backend Pydantic schemas
    router.tsx           # route table, ProtectedRoute wrapper
    App.tsx
    main.tsx
  index.html
  tailwind.config.ts
  vite.config.ts
  .env.example
  package.json
```

### 3.2 Key libraries

- **Routing:** `react-router-dom` v6+.
- **Server state:** `@tanstack/react-query` — every API call goes through a query/mutation hook, no manual `useEffect` fetch spaghetti.
- **Client/UI state:** `zustand` — auth token presence, current org, toast queue, modal open state. Not for server data.
- **Forms:** `react-hook-form` + `zod` (shared validation shape mirrored from backend Pydantic where practical).
- **HTTP:** `axios` with a response interceptor: on 401, attempt refresh-token flow once, else redirect to `/login`.
- **Styling:** Tailwind CSS with the custom `fd-*` palette from section 2.2.
- **Toasts:** a small custom toast store + component (no need for an extra dependency).

### 3.3 Conventions

- No page component exceeds ~200 lines; extract to `components/<domain>/`.
- Every list-fetching page uses the same `<LoadingState />`, `<ErrorState message retry />`, `<EmptyState />` components for consistency (see section 6 template).
- API client functions return typed data (`Promise<Project[]>`), never raw axios response — unwrap `.data` inside `api/*.ts`.

---

## 4. BACKEND ARCHITECTURE

### 4.1 Folder structure

```
flowdesk/backend/
  app/
    main.py              # FastAPI app instance, CORS, router includes, startup events
    config.py            # Pydantic Settings, reads .env
    db.py                # SQLAlchemy engine + session factory + get_db dependency
    deps.py              # shared FastAPI dependencies: get_current_user, require_role
    models/              # SQLAlchemy ORM models, one file per domain
      user.py
      organization.py
      membership.py
      project.py
      task.py
      comment.py
      incident.py
      approval.py
      document.py
      notification.py
      integration.py
      subscription.py
      audit_log.py
      base.py             # declarative base, mixins (TimestampMixin, UUIDPKMixin)
    schemas/              # Pydantic request/response models, mirrors models/
      (one file per domain, same names as models/)
    routers/              # FastAPI APIRouter per domain — thin, calls services
      auth.py
      users.py
      organizations.py
      projects.py
      tasks.py
      incidents.py
      approvals.py
      documents.py
      notifications.py
      integrations.py
      billing.py
      audit.py
    services/             # business logic, one file per domain, called by routers
      auth_service.py
      project_service.py
      task_service.py
      incident_service.py
      approval_service.py
      document_service.py
      notification_service.py
      audit_service.py
    core/
      security.py         # password hashing (passlib/bcrypt), JWT encode/decode
      permissions.py       # role matrix + require_role() dependency factory
      storage.py            # StorageProvider interface + LocalStorageProvider impl
      rate_limit.py          # simple in-memory or slowapi rate limiter for auth routes
    alembic/
      versions/
      env.py
    tests/
      conftest.py           # test DB fixture (separate test schema or sqlite for speed)
      test_auth.py
      test_projects.py
      test_tasks.py
      test_incidents.py
      test_approvals.py
      test_notifications.py
      test_permissions.py
  alembic.ini
  requirements.txt
  .env.example
  pytest.ini
```

### 4.2 Key libraries

- `fastapi`, `uvicorn[standard]`
- `sqlalchemy>=2.0`, `alembic`, `pymysql` (or `mysqlclient`) as the MySQL driver
- `pydantic>=2`, `pydantic-settings`
- `python-jose[cryptography]` or `pyjwt` for JWT; `passlib[bcrypt]` for hashing
- `python-multipart` for file uploads
- `pytest`, `httpx` (FastAPI's `TestClient` uses httpx)
- Optional: `slowapi` for rate limiting (thin wrapper on top of `limits`), or hand-roll a simple in-memory sliding window — either is fine, prefer `slowapi` since it's a small well-known dependency and saves reinventing token-bucket logic.

### 4.3 Layering rule

Routers depend on Services depend on Models/DB. Routers never touch SQLAlchemy
sessions directly beyond passing the `db` dependency through; all query logic
lives in `services/`. This keeps routers thin (validation + call + response)
and testable business logic isolated in services.

---

## 5. AUTHENTICATION

### 5.1 Flow

1. **Signup** (`POST /api/auth/signup`): creates User (bcrypt-hashed password),
   creates or joins an Organization (v1: signup always creates a new
   Organization with the signing-up user as Owner — joining an existing org
   happens via invite token, see 5.5), issues access + refresh tokens.
2. **Login** (`POST /api/auth/login`): verifies password, issues access +
   refresh tokens.
3. **Access token:** JWT, 15 minute expiry, payload = `{sub: user_id, org_id,
   role, exp}`. Sent as `Authorization: Bearer <token>` header, stored in
   memory / Zustand store on the frontend (not localStorage — XSS risk).
4. **Refresh token:** random opaque token (not JWT), 7 day expiry, stored
   hashed in a `refresh_tokens` table (or reuse `sessions` table), delivered
   to the frontend as an `httpOnly; Secure; SameSite=Strict` cookie set by the
   backend response. Frontend never reads it directly — axios interceptor
   calls `POST /api/auth/refresh` (browser sends the cookie automatically) on
   a 401, retries the original request once.
5. **Logout** (`POST /api/auth/logout`): revokes the refresh token (delete row
   / mark revoked), clears the cookie.
6. **Password reset:** `POST /api/auth/forgot-password` generates a random
   token (`secrets.token_urlsafe(32)`), stores its SHA-256 hash + expiry (1
   hour) on the user row, and — **since no email provider is configured in
   local dev** — logs the reset link to the backend console AND writes it to
   a dev-only endpoint `GET /api/dev/last-email` (guarded by `DEBUG=true`,
   disabled/404s in prod-like runs) so it's retrievable during manual/E2E
   testing. `POST /api/auth/reset-password` consumes the token once.
7. **Team invitations:** same token pattern, 24 hour expiry, same dev-only
   retrieval mechanism, consumed via `POST /api/organizations/invites/accept`.

### 5.2 Middleware / dependencies

- `get_current_user` (FastAPI dependency): decodes the bearer JWT, loads the
  User, raises `401` if invalid/expired.
- `require_role(*roles)`: dependency factory used on routes needing a minimum
  role, raises `403` if the current membership's role isn't in the allowed set.
- CORS: `allow_origins=["http://localhost:5173"]`, `allow_credentials=True`
  (needed for the refresh cookie) — never `"*"` with credentials.

### 5.3 Frontend auth state

- `authStore` (Zustand): `{ accessToken, user, org, isAuthenticated }`.
- On app load, if no in-memory token, silently attempt `POST /api/auth/refresh`
  (cookie-based) to restore a session; if it fails, treat as logged out.
- `ProtectedRoute` component wraps every route except Landing/Login/Signup;
  redirects to `/login` if `isAuthenticated` is false.
- 401 from any API call → clear store, redirect to `/login`, show a toast
  ("Session expired, please log in again").

### 5.4 Errors surfaced to the frontend

- 400: validation errors (field-level, from Pydantic — frontend maps to form
  field errors via a shared error-shape convention, see section 12.4).
- 401: invalid credentials / expired session.
- 403: authenticated but insufficient role.
- 409: e.g. signup email already registered.

### 5.5 Organization joining

Invite flow: Admin/Owner invites by email (`POST /api/organizations/invites`)
→ token generated → dev-logged link → invitee visits link → if they already
have an account, they accept and get a new Membership; if not, the accept page
also collects name/password (mini-signup) then creates the Membership.

---

## 6. FRONTEND ROUTES / PAGES

Route table:

```
/                      Landing         public
/login                 Login           public
/signup                Signup          public
/dashboard             Dashboard       protected
/projects              Projects        protected
/projects/:id          ProjectDetail   protected
/tasks                 Tasks           protected
/incidents             Incidents       protected
/incidents/:id         IncidentDetail  protected
/approvals             Approvals       protected
/documents             Documents       protected
/notifications         Notifications   protected
/team                  Team            protected (Admin+/Owner for mutations, all can view)
/integrations          Integrations    protected
/billing               Billing         protected (Admin+/Owner)
/settings              Settings        protected
/profile               Profile         protected
```

Every protected page below shares this template unless noted otherwise:

- **Loading:** skeleton rows/cards (not a spinner-only blank screen) while the
  primary TanStack Query is `isPending`.
- **Error:** `<ErrorState message="Couldn't load X." onRetry={refetch} />`.
- **Empty:** `<EmptyState title="No X yet" action="Create X" />` when the
  fetched list is empty (not an error).
- **Success feedback:** toast on create/update/delete ("Project created",
  "Task moved to Done", etc.).

### 6.1 Landing (`/`)
Purpose: marketing/entry page. Layout: hero, feature highlights (Projects,
Tasks, Incidents, Approvals), CTA buttons to `/signup` and `/login`. No API
calls. Navigation: top nav with Login/Signup buttons.

### 6.2 Login (`/login`)
Purpose: authenticate. Components: email/password form (react-hook-form +
zod). API: `POST /api/auth/login`. Actions: submit, "forgot password" link,
"sign up" link. Error state: inline "Invalid email or password" banner on 401.
Success: redirect to `/dashboard`.

### 6.3 Signup (`/signup`)
Purpose: create account + organization. Fields: name, email, password,
organization name. API: `POST /api/auth/signup`. Success: auto-login, redirect
`/dashboard`. Error: inline field errors (e.g. "Email already in use").

### 6.4 Dashboard (`/dashboard`)
Purpose: at-a-glance org overview. Data (all real, from backend, no
client-only fake numbers): open task count, active incident count, pending
approval count, project count/list, recent activity feed (last N audit log
entries), team activity, notification preview, a simple productivity stat
(e.g. tasks completed this week vs last week). API calls:
`GET /api/tasks?status=open&assignee=me`, `GET /api/incidents?status=active`,
`GET /api/approvals?status=pending&approver=me`, `GET /api/projects`,
`GET /api/audit?limit=10`, `GET /api/notifications?unread=true&limit=5`.
Filters: a time-range selector (Today / 7 days / 30 days) re-queries the
activity feed and productivity stat with a `since=` param. Permissions: same
view for all roles, scoped to the user's own assignments where relevant (e.g.
"my open tasks").

### 6.5 Projects (`/projects`)
Purpose: list + create projects. Components: `ProjectCard` grid or table
toggle, filter bar (status, priority), "New Project" button (Manager+).
API: `GET /api/projects?status=&priority=&page=`, `POST /api/projects`.
Permissions: Member/Viewer can view; Manager+ can create.

### 6.6 Project Detail (`/projects/:id`)
Purpose: single project view. Tabs: Overview, Tasks, Members, Activity.
Components: `ProjectForm` (edit, Manager+), `ProjectMembersList` (add/remove,
Manager+), `TaskTable` filtered to this project, activity feed (audit logs
filtered by resource). API: `GET /api/projects/{id}`,
`PATCH /api/projects/{id}`, `POST/DELETE /api/projects/{id}/members`,
`GET /api/tasks?project_id={id}`, `GET /api/audit?resource_type=project&resource_id={id}`.
Actions: edit, archive (soft — sets `status=archived`, doesn't delete), add
task shortcut.

### 6.7 Tasks (`/tasks`)
Purpose: cross-project task list ("my work" + org-wide view toggle).
Components: `TaskTable` with column sort, filter bar (status, priority,
assignee, project, search box), `TaskForm` modal for create/edit.
API: `GET /api/tasks?...filters&sort=&page=`, `POST /api/tasks`,
`PATCH /api/tasks/{id}`. Actions: inline status change (dropdown/drag),
assign, open detail drawer (comments + activity history inside a `Drawer`,
not a separate route, to keep the table context).

### 6.8 Incidents (`/incidents`)
Purpose: list + create incidents. Components: severity-coded table/cards,
filter bar (severity, status, assigned team). API: `GET /api/incidents?...`,
`POST /api/incidents`. Permissions: Member+ can create.

### 6.9 Incident Detail (`/incidents/:id`)
Purpose: full incident view — this is a flagship page. Layout: header
(title, severity badge, status badge, assigned team/user), left column
overview + `IncidentTimeline` (chronological, backend-persisted events),
right column comments + related tasks + attachments. API:
`GET /api/incidents/{id}`, `GET /api/incidents/{id}/events`,
`PATCH /api/incidents/{id}` (status change → also creates a timeline event
server-side), `POST /api/incidents/{id}/comments`,
`GET/POST /api/incidents/{id}/documents`. Actions: change status (dropdown
constrained to valid next states per lifecycle), reassign, comment, attach
document, link a task.

### 6.10 Approvals (`/approvals`)
Purpose: list approval requests (tabs: "Awaiting my approval", "My requests",
"All"). Components: `ApprovalStepper` mini-preview per row showing current
step. API: `GET /api/approvals?filter=`, `POST /api/approvals` (create
request with ordered steps + approvers per step).

### 6.11 Approval Detail (accessed via drawer/modal from `/approvals`, not a
separate route in v1 — keeps routing table smaller; acceptable per section
0's "conventional, maintainable" default)
Full `ApprovalStepper`, decision buttons (Approve/Reject with required
comment on reject) visible only to named approvers of the *current* step,
full history below. API: `GET /api/approvals/{id}`,
`POST /api/approvals/{id}/steps/{step_id}/decide`.

### 6.12 Documents (`/documents`)
Purpose: org-wide document library with filters (linked project, linked
incident, uploader). Components: `DocumentUploader` (drag-drop + button),
`DocumentList` with download/delete actions. API: `GET /api/documents?...`,
`POST /api/documents` (multipart), `DELETE /api/documents/{id}`,
`GET /api/documents/{id}/download`.

### 6.13 Notifications (`/notifications`)
Purpose: full notification history (the top-bar bell shows a dropdown
preview of the same data). API: `GET /api/notifications?page=`,
`PATCH /api/notifications/{id}/read`, `PATCH /api/notifications/read-all`.
Empty state: "You're all caught up."

### 6.14 Team (`/team`)
Purpose: member management. Components: member table (name, email, role,
joined date), invite form (Admin+), role `<Select>` per row (Admin+),
remove button (Admin+, cannot remove the last Owner). API:
`GET /api/organizations/{id}/members`,
`POST /api/organizations/{id}/invites`,
`PATCH /api/organizations/{id}/members/{user_id}`,
`DELETE /api/organizations/{id}/members/{user_id}`.

### 6.15 Integrations (`/integrations`)
Purpose: architecture showcase, no live functionality required. Cards for
GitHub, Slack, Google Drive, Jira, PagerDuty — name, description, connection
state badge, Connect/Disconnect button (stub: flips `connected` boolean via
`PATCH /api/integrations/{provider}`, no real OAuth call). Config UI (e.g. a
webhook URL text field) renders but doesn't need to function beyond saving
the value.

### 6.16 Billing (`/billing`)
Purpose: plan management. Shows current plan, usage bars (users used /
limit, projects used / limit — computed live from DB counts), plan
comparison table (Free/Starter/Business/Enterprise), upgrade/downgrade
buttons (Admin+/Owner only) that just `PATCH /api/billing/subscription`
(no payment gateway call — see section 16).

### 6.17 Settings (`/settings`)
Purpose: organization-level settings (org name, org-wide preferences).
Admin+/Owner only for edits; Member/Viewer see a read-only view or are
redirected with a message.

### 6.18 Profile (`/profile`)
Purpose: the logged-in user's own account: name, email, password change,
avatar (optional, can be initials-based, no upload required for v1).

---

## 7. ORGANIZATIONS, ROLES, PERMISSIONS

Roles: **Owner, Admin, Manager, Member, Viewer** (stored as an enum on
`memberships.role`, one row per user per organization — a user could in
theory belong to multiple orgs in the data model, though v1 UI assumes one
active org at a time via an org switcher stub in the top bar).

### 7.1 Role permission matrix (enforced server-side via `require_role`, not
just hidden in the UI)

| Action | Owner | Admin | Manager | Member | Viewer |
|---|---|---|---|---|---|
| Org settings / billing | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite / remove members / change roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create / edit / archive project | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create / edit task | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve / reject an approval step | ✅ | ✅ | ✅ (only if named approver on that step) | ❌ | ❌ |
| Create incident | ✅ | ✅ | ✅ | ✅ | ❌ |
| Upload document | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete document | ✅ | ✅ | ✅ | own uploads only | ❌ |
| View all org data | ✅ | ✅ | ✅ | ✅ | ✅ |

Cannot remove the last remaining Owner of an organization (backend check,
409 if attempted).

---

## 8. PROJECTS

**Fields:** id, organization_id, name, description, owner_id (FK → users),
status (enum: active/on_hold/completed/archived), priority (enum:
low/medium/high/critical), start_date, due_date, created_at, updated_at.

**Members:** many-to-many via `project_members` join table (project_id,
user_id, added_at).

**Operations:** create (Manager+), list (all, filterable by status/priority),
get detail, update (Manager+), archive (soft-delete via status flip,
Manager+), add/remove member (Manager+), list project tasks, list project
activity (audit logs filtered to this resource).

---

## 9. TASKS

**Fields:** id, project_id (FK, nullable — tasks can be standalone), title,
description, status (enum: backlog/todo/in_progress/review/done), priority
(enum: low/medium/high/critical), assignee_id (FK → users, nullable),
reporter_id (FK → users), due_date, created_at, updated_at.

**Labels:** many-to-many via `task_labels` join table + a small `labels`
lookup table (id, name, color) — org-scoped label set, created ad hoc or
pre-seeded (e.g. "bug", "feature", "urgent").

**Comments:** polymorphic-lite — a single `comments` table with
`commentable_type` (enum: task/incident/approval) + `commentable_id`, rather
than three separate comment tables. Avoids duplication, standard pattern.

**Operations:** full CRUD (Member+ for create/edit own or assigned; Manager+
for any), search (title/description ILIKE), filter (status, priority,
assignee, project, label), sort (due_date, priority, created_at), comment,
activity history (audit logs filtered to this resource).

---

## 10. INCIDENT MANAGEMENT

**Fields:** id, organization_id, title, description, severity (enum:
sev1/sev2/sev3/sev4), status (enum: detected/investigating/mitigating/
monitoring/resolved), assigned_team (free text or small lookup — free text is
fine for v1, avoids an unnecessary Teams table), assigned_user_id (FK,
nullable), created_at, updated_at, resolved_at (nullable, set when status
becomes resolved).

**incident_events (timeline):** id, incident_id, event_type (enum: created/
status_changed/reassigned/comment_added/document_attached/task_linked),
actor_id, description, metadata (JSON — e.g. `{from_status, to_status}`),
created_at. Every mutating action on an incident writes one of these rows
server-side inside the same service call — never inferred/reconstructed on
the frontend.

**Related tasks:** many-to-many via `incident_tasks` join table.

**Lifecycle transitions:** enforced as a directed sequence — Detected →
Investigating → Mitigating → Monitoring → Resolved. Backend validates the
requested `status` is a legal next state (or allows jumping forward but not
backward past Resolved, kept simple: any forward move allowed, any backward
move requires re-opening explicitly — a plain equality/ordering check on the
enum, no separate state-machine library needed for 5 linear states).

---

## 11. APPROVAL WORKFLOWS

**approvals:** id, organization_id, title, description, requester_id,
status (enum: pending/approved/rejected), current_step_order, created_at,
updated_at.

**approval_steps:** id, approval_id, step_order (int), status (enum:
pending/approved/rejected/skipped), decided_by (FK, nullable), decided_at
(nullable), comment (nullable).

**approval_step_approvers:** many-to-many (approval_step_id, user_id) — the
set of people eligible to decide that step.

**State machine (locked semantics):**
- Steps are strictly sequential by `step_order`.
- A step is "active" when all prior steps are `approved` and this one is
  `pending`.
- **Any one** named approver on the active step approving marks that step
  `approved`, advances `current_step_order`; if it was the last step, the
  whole `approval.status` becomes `approved`.
- **Any** named approver rejecting immediately sets that step to `rejected`
  AND the whole `approval.status` to `rejected` — later steps are marked
  `skipped`, the chain does not continue.
- Every decision persists actor, timestamp, and optional comment
  (comment required on reject, enforced by Pydantic validator).
- Only the named approvers of the *current active* step may act on it
  (backend check, 403 otherwise) — this is on top of the general role check
  (must also be Manager+ per section 7.1).

Notifications fire on: approval created (to first-step approvers), each
step decision (to requester + next-step approvers if advanced), final
approval/rejection (to requester).

---

## 12. DOCUMENT MANAGEMENT

**Fields:** id, organization_id, filename (original, display-only),
storage_key (UUID-based generated name, what's actually on disk),
content_type, size_bytes, uploaded_by (FK), project_id (nullable FK),
incident_id (nullable FK), created_at.

**Storage abstraction:**
```python
class StorageProvider(Protocol):
    def save(self, file: UploadFile, key: str) -> None: ...
    def get_path(self, key: str) -> Path: ...
    def delete(self, key: str) -> None: ...

class LocalStorageProvider:
    # writes under STORAGE_PATH (env var), default
    # flowdesk/storage/uploads/{key}
```
A `CloudStorageProvider` (S3, etc.) can implement the same Protocol later
without touching any calling code — this is the one deliberate abstraction
point, justified because storage backend is explicitly called out as
swappable in the spec.

**Upload validation:** max 10MB (`413` if exceeded), allowlist extensions
(pdf, doc, docx, xls, xlsx, png, jpg, jpeg, txt, csv, zip), verify declared
content-type against actual file signature (magic bytes, via `python-magic`
or a small manual signature check) not just the extension, store under a
generated UUID filename (never the user-supplied name — prevents path
traversal and collisions), serve downloads through an authenticated
`GET /api/documents/{id}/download` endpoint that streams the file — never
expose `storage/uploads/` as a static/public directory.

### 12.4 Shared error-shape convention (referenced from section 5.4)

All API errors return:
```json
{ "detail": "human readable message", "code": "SOME_ERROR_CODE", "fields": {"email": "already registered"} }
```
`fields` is present only for 422 validation errors, keyed by field name —
frontend forms map these directly onto `react-hook-form` field errors.

---

## 13. NOTIFICATIONS

**Fields:** id, user_id (recipient), organization_id, type (enum:
task_assigned/incident_assigned/approval_requested/approval_decided/
comment_added/team_invited/project_activity), title, body, link (frontend
route to navigate to on click), read (bool, default false), created_at.

Created server-side by the relevant service (e.g. `task_service.assign_task`
also calls `notification_service.create(...)`) — never client-triggered.

**API:** `GET /api/notifications?unread=&page=`,
`PATCH /api/notifications/{id}/read`, `PATCH /api/notifications/read-all`.
Unread count exposed via `GET /api/notifications/unread-count` (used by the
bell badge, polled every ~30s via TanStack Query `refetchInterval` — no
websocket needed for v1, polling is the conventional low-effort choice here).

---

## 14. TEAM MANAGEMENT

Covered in detail in section 6.14 and section 7. Data lives on
`memberships` (organization_id, user_id, role, joined_at) joined to `users`
(id, name, email, password_hash, created_at) — profile fields (name, email,
password) live on `users` since a user's identity is global, while `role` is
per-membership since it's org-scoped.

---

## 15. INTEGRATIONS

**Fields:** id, organization_id, provider (enum: github/slack/google_drive/
jira/pagerduty), connected (bool, default false), config (JSON, nullable —
e.g. webhook URL), connected_at (nullable).

**Provider abstraction:** a simple `IntegrationProvider` interface
(`connect()`, `disconnect()`, `test_connection()`) with stub implementations
per provider that just flip the `connected` flag — no real API calls, no
credentials stored or required. This is deliberately thin; do not build a
real OAuth flow for v1 (explicitly out of scope per the spec — "core app
must work without external integrations").

**API:** `GET /api/integrations`, `PATCH /api/integrations/{provider}`
(toggle connected + save config).

---

## 16. BILLING

**subscriptions:** id, organization_id, plan (enum: free/starter/business/
enterprise), status (enum: active/past_due/canceled — always "active" in
v1 since there's no real payment processor), user_limit, project_limit,
updated_at.

**Plan limits (seed defaults, enforced softly — a warning banner, not a hard
block, since this is local dev):**
```
Free:       5 users,   3 projects
Starter:    20 users,  15 projects
Business:   100 users, 100 projects
Enterprise: unlimited, unlimited
```

**Usage:** computed live — `COUNT(memberships)`, `COUNT(projects)` for the
org — never a stored/stale counter.

**Payment abstraction:** a `PaymentProvider` interface
(`create_checkout_session()`, `handle_webhook()`) with a `NullPaymentProvider`
stub that no-ops; `PATCH /api/billing/subscription` just updates the `plan`
column directly in v1. This is the second deliberate abstraction, justified
because a real payment provider is explicitly called out as future work.

---

## 17. AUDIT LOGGING

**audit_logs:** id, organization_id, actor_id (FK, nullable for system
events), action (string, e.g. `"task.created"`), resource_type (string,
e.g. `"task"`), resource_id (string/UUID), metadata (JSON), created_at.
Indexed on `(organization_id, created_at)` and `(resource_type, resource_id)`
for the "activity feed filtered to this resource" queries used on Project
Detail and Incident Detail pages.

Written via a single `audit_service.log(db, org_id, actor_id, action,
resource_type, resource_id, metadata={})` call, invoked from within the same
service method that performs the mutation (same DB transaction where the
ORM session allows it) — never a separate/async fire-and-forget call that
could silently fail to write.

**API:** `GET /api/audit?resource_type=&resource_id=&actor_id=&since=&page=`.

**Frontend:** a shared `ActivityFeed` component (used on Dashboard, Project
Detail, Incident Detail) renders `audit_logs` rows as human-readable lines
("Sarah Chen created task 'Fix login bug'", relative timestamp).

---

## 18. DATABASE SCHEMA

### 18.1 Textual ER diagram

```
users ──< memberships >── organizations
  │                              │
  │                              ├──< projects >──< project_members >── users
  │                              │        │
  │                              │        └──< tasks >──< task_labels >── labels
  │                              │                 │
  │                              │                 └──< comments (commentable_type=task)
  │                              │
  │                              ├──< incidents >──< incident_events
  │                              │        │
  │                              │        ├──< incident_tasks >── tasks
  │                              │        └──< comments (commentable_type=incident)
  │                              │
  │                              ├──< approvals >──< approval_steps >──< approval_step_approvers >── users
  │                              │                          │
  │                              │                          └──< comments (commentable_type=approval)
  │                              │
  │                              ├──< documents (nullable FK → projects, incidents)
  │                              ├──< notifications >── users (recipient)
  │                              ├──< integrations
  │                              ├──< subscriptions
  │                              └──< audit_logs
```

### 18.2 Table definitions

Conventions applied to every table: `id` = `CHAR(36)` UUID primary key (or
`BIGINT AUTO_INCREMENT` — either is fine; **use UUID** for public-facing IDs
to avoid enumeration, this is the one place worth the extra bytes),
`created_at`/`updated_at` = `DATETIME`, default `CURRENT_TIMESTAMP` /
`ON UPDATE CURRENT_TIMESTAMP` where applicable, all FKs indexed.

```
users
  id                UUID PK
  name              VARCHAR(255) NOT NULL
  email             VARCHAR(255) NOT NULL UNIQUE
  password_hash     VARCHAR(255) NOT NULL
  reset_token_hash  VARCHAR(255) NULL
  reset_token_expires_at DATETIME NULL
  created_at        DATETIME NOT NULL DEFAULT now
  updated_at        DATETIME NOT NULL DEFAULT now ON UPDATE now

organizations
  id            UUID PK
  name          VARCHAR(255) NOT NULL
  created_at    DATETIME NOT NULL

memberships
  id              UUID PK
  organization_id UUID FK -> organizations.id, INDEX
  user_id         UUID FK -> users.id, INDEX
  role            ENUM(owner,admin,manager,member,viewer) NOT NULL
  joined_at       DATETIME NOT NULL
  UNIQUE (organization_id, user_id)

invites
  id              UUID PK
  organization_id UUID FK, INDEX
  email           VARCHAR(255) NOT NULL
  role            ENUM(...) NOT NULL
  token_hash      VARCHAR(255) NOT NULL
  expires_at      DATETIME NOT NULL
  accepted_at     DATETIME NULL
  invited_by      UUID FK -> users.id

projects
  id              UUID PK
  organization_id UUID FK, INDEX
  name            VARCHAR(255) NOT NULL
  description     TEXT NULL
  owner_id        UUID FK -> users.id
  status          ENUM(active,on_hold,completed,archived) NOT NULL DEFAULT active
  priority        ENUM(low,medium,high,critical) NOT NULL DEFAULT medium
  start_date      DATE NULL
  due_date        DATE NULL
  created_at, updated_at

project_members
  project_id  UUID FK, INDEX
  user_id     UUID FK, INDEX
  added_at    DATETIME NOT NULL
  PRIMARY KEY (project_id, user_id)

labels
  id              UUID PK
  organization_id UUID FK, INDEX
  name            VARCHAR(50) NOT NULL
  color           VARCHAR(7) NOT NULL
  UNIQUE (organization_id, name)

tasks
  id            UUID PK
  project_id    UUID FK NULL, INDEX
  organization_id UUID FK, INDEX
  title         VARCHAR(255) NOT NULL
  description   TEXT NULL
  status        ENUM(backlog,todo,in_progress,review,done) NOT NULL DEFAULT backlog
  priority      ENUM(low,medium,high,critical) NOT NULL DEFAULT medium
  assignee_id   UUID FK -> users.id NULL, INDEX
  reporter_id   UUID FK -> users.id NOT NULL
  due_date      DATE NULL
  created_at, updated_at

task_labels
  task_id   UUID FK, INDEX
  label_id  UUID FK, INDEX
  PRIMARY KEY (task_id, label_id)

comments
  id                UUID PK
  organization_id   UUID FK, INDEX
  commentable_type  ENUM(task,incident,approval) NOT NULL
  commentable_id    UUID NOT NULL, INDEX (commentable_type, commentable_id)
  author_id         UUID FK -> users.id
  body              TEXT NOT NULL
  created_at

incidents
  id              UUID PK
  organization_id UUID FK, INDEX
  title           VARCHAR(255) NOT NULL
  description     TEXT NULL
  severity        ENUM(sev1,sev2,sev3,sev4) NOT NULL
  status          ENUM(detected,investigating,mitigating,monitoring,resolved) NOT NULL DEFAULT detected
  assigned_team   VARCHAR(100) NULL
  assigned_user_id UUID FK -> users.id NULL
  created_at, updated_at
  resolved_at     DATETIME NULL

incident_events
  id            UUID PK
  incident_id   UUID FK, INDEX
  event_type    ENUM(created,status_changed,reassigned,comment_added,document_attached,task_linked) NOT NULL
  actor_id      UUID FK -> users.id
  description   VARCHAR(500) NOT NULL
  metadata      JSON NULL
  created_at

incident_tasks
  incident_id  UUID FK, INDEX
  task_id      UUID FK, INDEX
  PRIMARY KEY (incident_id, task_id)

approvals
  id                UUID PK
  organization_id   UUID FK, INDEX
  title             VARCHAR(255) NOT NULL
  description       TEXT NULL
  requester_id      UUID FK -> users.id
  status            ENUM(pending,approved,rejected) NOT NULL DEFAULT pending
  current_step_order INT NOT NULL DEFAULT 1
  created_at, updated_at

approval_steps
  id            UUID PK
  approval_id   UUID FK, INDEX
  step_order    INT NOT NULL
  status        ENUM(pending,approved,rejected,skipped) NOT NULL DEFAULT pending
  decided_by    UUID FK -> users.id NULL
  decided_at    DATETIME NULL
  comment       TEXT NULL
  UNIQUE (approval_id, step_order)

approval_step_approvers
  approval_step_id  UUID FK, INDEX
  user_id           UUID FK, INDEX
  PRIMARY KEY (approval_step_id, user_id)

documents
  id              UUID PK
  organization_id UUID FK, INDEX
  filename        VARCHAR(255) NOT NULL
  storage_key     VARCHAR(255) NOT NULL UNIQUE
  content_type    VARCHAR(100) NOT NULL
  size_bytes      INT NOT NULL
  uploaded_by     UUID FK -> users.id
  project_id      UUID FK NULL, INDEX
  incident_id     UUID FK NULL, INDEX
  created_at

notifications
  id              UUID PK
  user_id         UUID FK, INDEX
  organization_id UUID FK, INDEX
  type            ENUM(task_assigned,incident_assigned,approval_requested,approval_decided,comment_added,team_invited,project_activity) NOT NULL
  title           VARCHAR(255) NOT NULL
  body            VARCHAR(500) NULL
  link            VARCHAR(255) NULL
  read            BOOLEAN NOT NULL DEFAULT false, INDEX (user_id, read)
  created_at

integrations
  id              UUID PK
  organization_id UUID FK, INDEX
  provider        ENUM(github,slack,google_drive,jira,pagerduty) NOT NULL
  connected       BOOLEAN NOT NULL DEFAULT false
  config          JSON NULL
  connected_at    DATETIME NULL
  UNIQUE (organization_id, provider)

subscriptions
  id              UUID PK
  organization_id UUID FK UNIQUE
  plan            ENUM(free,starter,business,enterprise) NOT NULL DEFAULT free
  status          ENUM(active,past_due,canceled) NOT NULL DEFAULT active
  user_limit      INT NOT NULL
  project_limit   INT NOT NULL
  updated_at

audit_logs
  id              UUID PK
  organization_id UUID FK, INDEX (organization_id, created_at)
  actor_id        UUID FK -> users.id NULL
  action          VARCHAR(100) NOT NULL
  resource_type   VARCHAR(50) NOT NULL
  resource_id     VARCHAR(36) NOT NULL, INDEX (resource_type, resource_id)
  metadata        JSON NULL
  created_at
```

---

## 19. API DESIGN

Response envelope convention: list endpoints return
`{ "items": [...], "total": N, "page": 1, "page_size": 20 }`; single-resource
endpoints return the resource directly; errors follow the shape in 12.4.

Auth requirement on every route below unless marked public: `Bearer` access
token required, and the user's membership role must satisfy the route's
`require_role(...)` where noted.

### auth
```
POST   /api/auth/signup              public   → {access_token, user, org}
POST   /api/auth/login               public   → {access_token, user, org}
POST   /api/auth/refresh             public (cookie-based) → {access_token}
POST   /api/auth/logout              auth     → 204
POST   /api/auth/forgot-password     public   → 204 (always, don't leak email existence)
POST   /api/auth/reset-password      public   → 204
GET    /api/dev/last-email           DEBUG-only → {to, subject, link}
```

### users / profile
```
GET    /api/users/me                 auth → User
PATCH  /api/users/me                 auth → User (name, password change)
```

### organizations
```
GET    /api/organizations/{id}                    auth
PATCH  /api/organizations/{id}                     Admin+
GET    /api/organizations/{id}/members              auth
POST   /api/organizations/{id}/invites               Admin+   → Invite
POST   /api/organizations/invites/accept              public   → {access_token, user, org}
PATCH  /api/organizations/{id}/members/{user_id}       Admin+   (role change)
DELETE /api/organizations/{id}/members/{user_id}        Admin+   (409 if last Owner)
```

### projects
```
GET    /api/projects?status=&priority=&page=              auth
POST   /api/projects                                        Manager+
GET    /api/projects/{id}                                   auth
PATCH  /api/projects/{id}                                    Manager+
DELETE /api/projects/{id}  (soft: sets status=archived)        Manager+
POST   /api/projects/{id}/members  {user_id}                    Manager+
DELETE /api/projects/{id}/members/{user_id}                       Manager+
```

### tasks
```
GET    /api/tasks?project_id=&status=&priority=&assignee_id=&search=&sort=&page=   auth
POST   /api/tasks                                                                    Member+
GET    /api/tasks/{id}                                                               auth
PATCH  /api/tasks/{id}                                                                Member+ (own/assigned) or Manager+ (any)
DELETE /api/tasks/{id}                                                                 Manager+
POST   /api/tasks/{id}/comments   {body}                                                Member+
GET    /api/tasks/{id}/comments                                                          auth
```

### incidents
```
GET    /api/incidents?severity=&status=&assigned_team=&page=      auth
POST   /api/incidents                                                Member+
GET    /api/incidents/{id}                                            auth
PATCH  /api/incidents/{id}   (status/severity/assignment changes)       Member+
GET    /api/incidents/{id}/events                                        auth
POST   /api/incidents/{id}/comments  {body}                                Member+
POST   /api/incidents/{id}/tasks  {task_id}   (link related task)             Member+
GET    /api/incidents/{id}/documents                                            auth
```

### approvals
```
GET    /api/approvals?status=&filter=mine|requested|all&page=       auth
POST   /api/approvals   {title, description, steps: [{approvers: [user_id]}]}   Manager+
GET    /api/approvals/{id}                                                        auth
POST   /api/approvals/{id}/steps/{step_id}/decide  {decision, comment}              named approver on active step
```

### documents
```
GET    /api/documents?project_id=&incident_id=&page=      auth
POST   /api/documents   (multipart: file, project_id?, incident_id?)     Member+
GET    /api/documents/{id}/download                                        auth
DELETE /api/documents/{id}                                                   uploader or Manager+
```

### notifications
```
GET    /api/notifications?unread=&page=          auth
GET    /api/notifications/unread-count             auth
PATCH  /api/notifications/{id}/read                  auth (own only)
PATCH  /api/notifications/read-all                     auth (own only)
```

### integrations
```
GET    /api/integrations                    auth
PATCH  /api/integrations/{provider}  {connected, config}   Admin+
```

### billing
```
GET    /api/billing/subscription        auth
PATCH  /api/billing/subscription  {plan}   Admin+
GET    /api/billing/usage                 auth
```

### audit
```
GET    /api/audit?resource_type=&resource_id=&actor_id=&since=&page=   auth
```

---

## 20. LOCAL CONFIGURATION

### backend/.env.example
```
ENV=development
DEBUG=true
APP_URL=http://localhost:5173
API_URL=http://localhost:8001

DB_HOST=localhost
DB_PORT=3306
DB_NAME=flowdesk
DB_USER=root
DB_PASSWORD=

JWT_SECRET=change-me-to-a-random-32-byte-string
JWT_ACCESS_EXPIRE_MINUTES=15
JWT_REFRESH_EXPIRE_DAYS=7

STORAGE_PATH=./storage/uploads
MAX_UPLOAD_SIZE_MB=10

CORS_ORIGINS=http://localhost:5173
```

### frontend/.env.example
```
VITE_API_URL=http://localhost:8001
```

**Variable explanations:**
- `DB_*` — MySQL connection, points at the local `flowdesk` database only.
- `JWT_SECRET` — signs access tokens; generate with `python -c "import
  secrets; print(secrets.token_urlsafe(32))"`, never commit a real value.
- `STORAGE_PATH` — where uploaded files land on disk, relative to
  `backend/` by default; swap to an absolute path or a future cloud bucket
  reference without changing calling code (see `StorageProvider`).
- `CORS_ORIGINS` — comma-separated allowlist, must exactly match the
  frontend's origin for the credentialed refresh-cookie flow to work.

---

## 21. DEMO / SEED DATA

`backend/app/seed.py`, run via `python -m app.seed` (or a `make seed` /
`alembic`-adjacent script). Must be idempotent-safe enough for local dev
(either truncate-and-reseed, or check-and-skip if Acme Technologies already
exists).

**Organization:** Acme Technologies.

**Users** (all seeded with the same password `Password123!`, printed by the
seed script on completion):
```
Alex Morgan    — Owner
Sarah Chen     — Admin
Daniel Patel   — Manager  (Engineering Manager)
Maya Singh     — Manager  (Security)
James Wilson   — Member   (Developer)
```

**Projects (3-4):** e.g. "Platform Migration" (active, high priority),
"Q3 Security Audit" (active, critical), "Customer Portal Redesign"
(on_hold, medium), each with 2-3 members and a realistic date range.

**Tasks (15-20):** spread across all 5 statuses and all 4 priorities,
assigned across the 5 seeded users, a few with labels ("bug", "feature",
"urgent") and 1-2 comments each on a handful of them.

**Incidents (4-5):** spread across severities and lifecycle stages — at
least one `resolved` (with `resolved_at` set and a full timeline), one
`investigating`, one fresh `detected`. Each with 2-4 timeline events and at
least one comment.

**Approvals (3):** one fully `approved` (2-step, full history), one
`pending` sitting on step 1 (so a seeded user has something "awaiting my
approval" on the Dashboard), one `rejected`.

**Documents (3-4):** a couple of small placeholder text/PDF files, attached
to a mix of projects and incidents.

**Notifications (8-10):** mix of read/unread across the seeded users so the
bell badge and Notifications page aren't empty on first login.

**Audit logs:** generated as a natural side effect of the seed script
calling the real services (not hand-inserted rows) — this both populates
the activity feed *and* smoke-tests that the audit hooks fire correctly.

**Subscription:** Acme Technologies seeded on the `business` plan.

---

## 22. TESTING STRATEGY

### Backend (pytest)
- `test_auth.py` — signup, login (correct/incorrect password), refresh,
  logout, password reset happy path.
- `test_permissions.py` — for each restricted action in the role matrix
  (section 7.1), assert a `Viewer`/`Member` gets 403 where they should.
- `test_projects.py`, `test_tasks.py` — CRUD, filters.
- `test_incidents.py` — full lifecycle transition sequence, verify
  `incident_events` rows are written.
- `test_approvals.py` — sequential steps, any-approver-satisfies,
  rejection-kills-request, skipped-steps-on-rejection.
- `test_notifications.py` — assignment triggers a notification row.
- Use a dedicated test database (either a separate MySQL schema
  `flowdesk_test` or SQLite in-memory for speed if the ORM usage stays
  DB-agnostic — prefer a real MySQL test schema for fidelity since
  MySQL-specific ENUM/JSON behavior matters here).

### Frontend (Vitest + React Testing Library)
- Component tests for `TaskTable` (renders rows, filter interaction),
  `ApprovalStepper` (renders correct current-step highlighting), form
  validation on `ProjectForm`/`TaskForm`.
- Page-level smoke test for Login (renders, submits, shows error on 401
  via a mocked API response).

### End-to-end (manual walkthrough during Phase 21, scripted checklist —
a full Playwright/Cypress suite is not required for v1, the manual sequence
below is the acceptance test)
```
Signup → Login → Create project → Create task → Assign task →
Create incident → Change incident status (verify timeline event) →
Create approval (2 steps) → Approve step 1 as a named approver →
Approve step 2 → verify approval.status=approved →
Upload document → link to the project →
Check notification bell shows the assignment/approval notifications →
Check /audit or activity feed shows the corresponding entries
```

---

## 23. IMPLEMENTATION PHASES

Each phase: goal, files/modules, dependencies, tasks, DB changes, API
changes, frontend changes, tests, completion criteria. Execute in order;
do not skip ahead speculatively.

### Phase 0 — Inspect environment
- **Goal:** confirm the local machine matches this document's assumptions
  before writing code.
- **Tasks:** check `C:\Users\Sharrvin\OneDrive\Documents\GitHub\flowdesk`
  exists (create if not); check ports 8001/5173/3306 are free
  (`netstat`/`Test-NetConnection`); check a local MySQL server is reachable
  at `localhost:3306` with `root`/blank password (adjust `.env` if not);
  confirm `fantom.ai` repo is present and untouched-by-default (do not open
  it for editing, read-only reference only).
- **Completion:** ports confirmed or reassigned + noted in section 0.1 and
  BUILD STATE > KNOWN ISSUES; MySQL reachable.

### Phase 1 — Initialize repository
- **Tasks:** create `frontend/` (Vite React-TS template) and `backend/`
  (FastAPI skeleton) folders per sections 3.1/4.1; init git; add root
  `.gitignore` (node_modules, __pycache__, .env, storage/uploads/*).
- **Completion:** both folders scaffolded, `git status` clean baseline
  commit made.

### Phase 2 — Backend foundation
- **Tasks:** `config.py` (Pydantic Settings reading `.env`), `db.py`
  (SQLAlchemy engine/session), `main.py` (FastAPI app + CORS + health
  route `GET /api/health`), `requirements.txt`, Alembic init.
- **Completion:** `uvicorn app.main:app --port 8001` runs, `/api/health`
  returns 200.

### Phase 3 — MySQL / database / migrations
- **Tasks:** create `flowdesk` DB if missing; write all SQLAlchemy models
  per section 18.2; generate + run first Alembic migration.
- **DB changes:** all tables from section 18.2 created.
- **Completion:** `alembic upgrade head` succeeds against local MySQL,
  tables visible via `SHOW TABLES`.

### Phase 4 — Authentication
- **Tasks:** `core/security.py` (hashing, JWT), `routers/auth.py`,
  `services/auth_service.py`, `deps.py` (`get_current_user`), refresh-token
  storage (table or reuse a `sessions` table), rate limiting on
  auth routes, dev-only `/api/dev/last-email`.
- **API changes:** all `/api/auth/*` routes from section 19.
- **Tests:** `test_auth.py`.
- **Completion:** signup/login/refresh/logout/reset all pass tests and
  manual curl checks.

### Phase 5 — Organizations / RBAC
- **Tasks:** `routers/organizations.py`, membership/invite services,
  `core/permissions.py` (`require_role` dependency).
- **Tests:** `test_permissions.py` (at least the invite/role-change/remove
  cases).
- **Completion:** invite flow works end-to-end (dev-logged link →
  accept → new membership).

### Phase 6 — Frontend foundation
- **Tasks:** Tailwind config with `fd-*` palette (section 2.2), router
  table (section 6), `AppShell`/`Sidebar`/`TopBar` layout components,
  `authStore`, `api/client.ts` with the refresh interceptor, Login/Signup
  pages wired to real endpoints, `ProtectedRoute`.
- **Completion:** can sign up, log in, land on an (empty) Dashboard shell,
  refresh-on-reload keeps the session.

### Phase 7 — Dashboard
- **Tasks:** wire the real queries listed in section 6.4 (will mostly
  return empty until later phases add data — acceptable, empty states
  should render correctly).
- **Completion:** page loads with correct loading/empty states, no console
  errors.

### Phase 8 — Projects
- **Backend:** `routers/projects.py`, `services/project_service.py`.
- **Frontend:** Projects list page, Project Detail page (Overview + Members
  tabs first, Tasks/Activity tabs stubbed until Phases 9/17).
- **Tests:** `test_projects.py`.
- **Completion:** full project CRUD works through the UI.

### Phase 9 — Tasks
- **Backend:** `routers/tasks.py`, `services/task_service.py`, comments
  (generic `comments` table, task-scoped for now).
- **Frontend:** Tasks page (table, filters, form modal, detail drawer with
  comments), wire Project Detail's Tasks tab.
- **Tests:** `test_tasks.py`.
- **Completion:** full task CRUD, filtering, sorting, commenting works.

### Phase 10 — Incidents
- **Backend:** `routers/incidents.py`, `services/incident_service.py`
  (lifecycle validation + `incident_events` writes), incident comments,
  incident-task linking.
- **Frontend:** Incidents list + Incident Detail (timeline, comments,
  related tasks).
- **Tests:** `test_incidents.py`.
- **Completion:** status changes correctly append timeline events; full
  incident detail page renders real data.

### Phase 11 — Approvals
- **Backend:** `routers/approvals.py`, `services/approval_service.py`
  (state machine per section 11).
- **Frontend:** Approvals list + step decision UI (drawer/modal per
  section 6.11).
- **Tests:** `test_approvals.py`.
- **Completion:** sequential/any-approver/rejection-kills-chain semantics
  verified by tests and one manual walkthrough.

### Phase 12 — Documents
- **Backend:** `core/storage.py` (`StorageProvider`/`LocalStorageProvider`),
  `routers/documents.py`, `services/document_service.py` (validation per
  section 12).
- **Frontend:** Documents page, uploader component, wire into Project
  Detail and Incident Detail.
- **Completion:** upload/download/delete work, files land under
  `storage/uploads/` with UUID names, downloads are auth-gated.

### Phase 13 — Notifications
- **Backend:** `services/notification_service.py`, hook calls into task
  assignment / incident assignment / approval events / comments / invites
  (retrofit into the services built in Phases 9-12).
- **Frontend:** `NotificationBell` (polling unread count), Notifications
  page.
- **Tests:** `test_notifications.py`.
- **Completion:** performing the trigger actions produces visible
  notifications for the right recipient.

### Phase 14 — Team management
- **Frontend:** Team page (member table, invite form, role changes,
  removal) wired to Phase 5's backend endpoints.
- **Completion:** an Admin can invite, change roles, and remove members
  through the UI; a non-Admin sees no mutation controls.

### Phase 15 — Integrations
- **Backend:** `routers/integrations.py`, stub provider toggle.
- **Frontend:** Integrations page (5 provider cards).
- **Completion:** connect/disconnect toggles persist and reflect in UI.

### Phase 16 — Billing
- **Backend:** `routers/billing.py`, usage computation.
- **Frontend:** Billing page (plan display, usage bars, comparison,
  upgrade/downgrade).
- **Completion:** plan switch persists, usage numbers match live DB counts.

### Phase 17 — Audit logs
- **Backend:** `services/audit_service.py`, retrofit `audit_service.log(...)`
  calls into every mutating service method from Phases 4-16 (this phase is
  largely going back through earlier services to add the missing calls —
  budget real time for this, it's not just a new page).
- **Frontend:** `ActivityFeed` component, wire into Dashboard, Project
  Detail, Incident Detail; audit log filter UI if time allows (nice-to-have,
  not blocking).
- **Completion:** every action in section 17's event list produces a
  correctly-attributed row.

### Phase 18 — Seed data
- **Tasks:** write `app/seed.py` per section 21, calling real services
  (not raw inserts) so it also exercises the audit hooks.
- **Completion:** `python -m app.seed` populates a fresh DB such that the
  Dashboard looks alive immediately after login as any seeded user.

### Phase 19 — Testing
- **Tasks:** fill in any test files not yet written in earlier phases,
  run full `pytest` and `vitest` suites, run `npm run build` to confirm
  the frontend builds cleanly.
- **Completion:** all tests green, production build succeeds with no
  TypeScript errors.

### Phase 20 — UI polish
- **Tasks:** pass over every page for consistent loading/error/empty
  states (section 6 template), verify the colour tokens (section 2) are
  applied consistently and nothing default-Tailwind-blue slipped in,
  responsive check at tablet width (768px) per section on responsive
  design, toast consistency on all mutations.
- **Completion:** visual QA pass done, no obviously broken/unstyled states.

### Phase 21 — Final verification
- **Tasks:** run the full manual checklist below and the E2E walkthrough
  from section 22; fix anything broken rather than stopping at the first
  failure; update BUILD STATE to reflect true final status.
```
1. Start MySQL, confirm flowdesk DB reachable
2. Run alembic upgrade head
3. Run seed script
4. Start backend (port 8001), confirm /api/health
5. Start frontend (port 5173)
6. Login as each seeded role, spot-check permission boundaries
7. Full CRUD pass: project, task, incident, approval, document
8. Confirm notifications fire and mark-as-read works
9. Confirm audit/activity feed populated and accurate
10. Confirm all sidebar navigation links work
11. npm run build succeeds
12. pytest suite green
13. npm audit / pip-audit reviewed, no unaddressed High/Critical
14. Confirm fantom.ai untouched (git status clean in that repo, its
    services unaffected)
```

---

## 24. SQLALCHEMY MODELS — ACTUAL CODE

This section supersedes the plain-text table listing in section 18.2 with
runnable model code. `models/base.py` first, then one block per domain file.
Every model inherits `Base` + the two mixins below — do not redefine
`id`/`created_at`/`updated_at` per model.

```python
# app/models/base.py
import uuid
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class UUIDPKMixin:
    id: Mapped[str] = mapped_column(
        CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
```

```python
# app/models/user.py
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPKMixin, TimestampMixin

class User(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    reset_token_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reset_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    memberships: Mapped[list["Membership"]] = relationship(back_populates="user")
```

```python
# app/models/organization.py
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPKMixin, TimestampMixin

class Organization(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    memberships: Mapped[list["Membership"]] = relationship(back_populates="organization")
    projects: Mapped[list["Project"]] = relationship(back_populates="organization")
```

```python
# app/models/membership.py
import enum
from sqlalchemy import ForeignKey, DateTime, Enum, UniqueConstraint, func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPKMixin

class RoleEnum(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    manager = "manager"
    member = "member"
    viewer = "viewer"

class Membership(Base, UUIDPKMixin):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"), index=True)
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), nullable=False)
    joined_at: Mapped["datetime"] = mapped_column(DateTime, server_default=func.now())

    organization: Mapped["Organization"] = relationship(back_populates="memberships")
    user: Mapped["User"] = relationship(back_populates="memberships")
```

```python
# app/models/project.py
import enum
from datetime import date
from sqlalchemy import String, Text, Date, ForeignKey, Enum
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPKMixin, TimestampMixin

class ProjectStatus(str, enum.Enum):
    active = "active"; on_hold = "on_hold"; completed = "completed"; archived = "archived"

class Priority(str, enum.Enum):
    low = "low"; medium = "medium"; high = "high"; critical = "critical"

class Project(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "projects"

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"))
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus), default=ProjectStatus.active)
    priority: Mapped[Priority] = mapped_column(Enum(Priority), default=Priority.medium)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="projects")
    tasks: Mapped[list["Task"]] = relationship(back_populates="project")
```

```python
# app/models/project_member.py
from sqlalchemy import ForeignKey, DateTime, func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class ProjectMember(Base):
    __tablename__ = "project_members"

    project_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("projects.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"), primary_key=True)
    added_at: Mapped["datetime"] = mapped_column(DateTime, server_default=func.now())
```

```python
# app/models/task.py
import enum
from datetime import date
from sqlalchemy import String, Text, Date, ForeignKey, Enum
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPKMixin, TimestampMixin
from app.models.project import Priority  # reuse same enum values

class TaskStatus(str, enum.Enum):
    backlog = "backlog"; todo = "todo"; in_progress = "in_progress"
    review = "review"; done = "done"

class Task(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "tasks"

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    project_id: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("projects.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.backlog)
    priority: Mapped[Priority] = mapped_column(Enum(Priority), default=Priority.medium)
    assignee_id: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("users.id"), nullable=True, index=True)
    reporter_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"))
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    project: Mapped["Project"] = relationship(back_populates="tasks")
    labels: Mapped[list["Label"]] = relationship(secondary="task_labels")
```

```python
# app/models/label.py + task_label.py
from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin

class Label(Base, UUIDPKMixin):
    __tablename__ = "labels"
    __table_args__ = (UniqueConstraint("organization_id", "name"),)
    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False)

class TaskLabel(Base):
    __tablename__ = "task_labels"
    task_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("tasks.id"), primary_key=True)
    label_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("labels.id"), primary_key=True)
```

```python
# app/models/comment.py
import enum
from sqlalchemy import Text, ForeignKey, Enum, Index
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin, TimestampMixin

class CommentableType(str, enum.Enum):
    task = "task"; incident = "incident"; approval = "approval"

class Comment(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "comments"
    __table_args__ = (Index("ix_commentable", "commentable_type", "commentable_id"),)

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    commentable_type: Mapped[CommentableType] = mapped_column(Enum(CommentableType), nullable=False)
    commentable_id: Mapped[str] = mapped_column(CHAR(36), nullable=False)
    author_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text, nullable=False)
```

```python
# app/models/incident.py
import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPKMixin, TimestampMixin

class Severity(str, enum.Enum):
    sev1 = "sev1"; sev2 = "sev2"; sev3 = "sev3"; sev4 = "sev4"

class IncidentStatus(str, enum.Enum):
    detected = "detected"; investigating = "investigating"
    mitigating = "mitigating"; monitoring = "monitoring"; resolved = "resolved"

# Ordering used by the service layer to validate forward transitions
INCIDENT_STATUS_ORDER = [
    IncidentStatus.detected, IncidentStatus.investigating,
    IncidentStatus.mitigating, IncidentStatus.monitoring, IncidentStatus.resolved,
]

class Incident(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "incidents"

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[Severity] = mapped_column(Enum(Severity), nullable=False)
    status: Mapped[IncidentStatus] = mapped_column(Enum(IncidentStatus), default=IncidentStatus.detected)
    assigned_team: Mapped[str | None] = mapped_column(String(100), nullable=True)
    assigned_user_id: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    events: Mapped[list["IncidentEvent"]] = relationship(back_populates="incident")

class IncidentEventType(str, enum.Enum):
    created = "created"; status_changed = "status_changed"; reassigned = "reassigned"
    comment_added = "comment_added"; document_attached = "document_attached"; task_linked = "task_linked"

class IncidentEvent(Base, UUIDPKMixin):
    __tablename__ = "incident_events"

    incident_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("incidents.id"), index=True)
    event_type: Mapped[IncidentEventType] = mapped_column(Enum(IncidentEventType), nullable=False)
    actor_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"))
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default="now()")

    incident: Mapped["Incident"] = relationship(back_populates="events")

class IncidentTask(Base):
    __tablename__ = "incident_tasks"
    incident_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("incidents.id"), primary_key=True)
    task_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("tasks.id"), primary_key=True)
```

```python
# app/models/approval.py
import enum
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPKMixin, TimestampMixin

class ApprovalStatus(str, enum.Enum):
    pending = "pending"; approved = "approved"; rejected = "rejected"

class ApprovalStepStatus(str, enum.Enum):
    pending = "pending"; approved = "approved"; rejected = "rejected"; skipped = "skipped"

class Approval(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "approvals"

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    requester_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"))
    status: Mapped[ApprovalStatus] = mapped_column(Enum(ApprovalStatus), default=ApprovalStatus.pending)
    current_step_order: Mapped[int] = mapped_column(Integer, default=1)

    steps: Mapped[list["ApprovalStep"]] = relationship(back_populates="approval", order_by="ApprovalStep.step_order")

class ApprovalStep(Base, UUIDPKMixin):
    __tablename__ = "approval_steps"
    __table_args__ = (UniqueConstraint("approval_id", "step_order"),)

    approval_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("approvals.id"), index=True)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ApprovalStepStatus] = mapped_column(Enum(ApprovalStepStatus), default=ApprovalStepStatus.pending)
    decided_by: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("users.id"), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    approval: Mapped["Approval"] = relationship(back_populates="steps")
    approvers: Mapped[list["User"]] = relationship(secondary="approval_step_approvers")

class ApprovalStepApprover(Base):
    __tablename__ = "approval_step_approvers"
    approval_step_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("approval_steps.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"), primary_key=True)
```

```python
# app/models/document.py, notification.py, integration.py, subscription.py, audit_log.py
# — same pattern as above, fields exactly per section 18.2's table definitions.
# Not repeated verbatim here to avoid duplicating the same field list twice;
# apply the same Mapped[]/mapped_column() style shown above to every column
# listed in section 18.2 for these five remaining tables.
```

---

## 25. PYDANTIC SCHEMAS — ACTUAL CODE (example: Tasks domain, full pattern)

Every domain follows this exact three-schema shape: `<Name>Create` (request
body for POST), `<Name>Update` (request body for PATCH, all fields
optional), `<Name>Out` (response shape, `model_config = {"from_attributes":
True}` to read directly off the ORM object). Apply this pattern to every
domain in section 4.1's `schemas/` folder — Tasks shown in full below as the
template.

```python
# app/schemas/task.py
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator
from app.models.task import TaskStatus
from app.models.project import Priority

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    project_id: str | None = None
    status: TaskStatus = TaskStatus.backlog
    priority: Priority = Priority.medium
    assignee_id: str | None = None
    due_date: date | None = None
    label_ids: list[str] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("title cannot be blank")
        return v.strip()

class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    status: TaskStatus | None = None
    priority: Priority | None = None
    assignee_id: str | None = None
    due_date: date | None = None
    label_ids: list[str] | None = None

class LabelOut(BaseModel):
    id: str
    name: str
    color: str
    model_config = {"from_attributes": True}

class TaskOut(BaseModel):
    id: str
    project_id: str | None
    title: str
    description: str | None
    status: TaskStatus
    priority: Priority
    assignee_id: str | None
    reporter_id: str
    due_date: date | None
    labels: list[LabelOut]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class TaskListOut(BaseModel):
    items: list[TaskOut]
    total: int
    page: int
    page_size: int

class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=5_000)

class CommentOut(BaseModel):
    id: str
    author_id: str
    body: str
    created_at: datetime
    model_config = {"from_attributes": True}
```

Apply the identical `Create`/`Update`/`Out`/`ListOut` pattern for: `auth.py`
(`SignupRequest`, `LoginRequest`, `TokenResponse`, `UserOut`),
`organization.py` (`OrganizationOut`, `InviteCreate`, `InviteOut`,
`MembershipOut`), `project.py`, `incident.py` (+ `IncidentEventOut`),
`approval.py` (+ `ApprovalStepOut`, `ApprovalDecisionRequest`),
`document.py` (`DocumentOut` — no `Create`, that route takes `UploadFile`
directly, not a JSON body), `notification.py` (`NotificationOut` only, no
create — server-generated), `integration.py` (`IntegrationUpdate`,
`IntegrationOut`), `billing.py` (`SubscriptionOut`, `SubscriptionUpdate`,
`UsageOut`), `audit.py` (`AuditLogOut` only).

---

## 26. ENDPOINT REQUEST/RESPONSE EXAMPLES

Every route from section 19, with a concrete example payload. Auth header
omitted from examples for brevity — assume `Authorization: Bearer <token>`
on every non-public route.

### `POST /api/auth/signup`
```json
// Request
{
  "name": "Alex Morgan",
  "email": "alex@acme.test",
  "password": "Password123!",
  "organization_name": "Acme Technologies"
}
// Response 201
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {"id": "9f1c...", "name": "Alex Morgan", "email": "alex@acme.test"},
  "organization": {"id": "3a2b...", "name": "Acme Technologies"}
}
// refresh token delivered as httpOnly Set-Cookie, not in the JSON body
```

### `POST /api/auth/login`
```json
// Request
{ "email": "alex@acme.test", "password": "Password123!" }
// Response 200 — same shape as signup
// Response 401
{ "detail": "Invalid email or password", "code": "INVALID_CREDENTIALS" }
```

### `POST /api/projects`
```json
// Request
{
  "name": "Platform Migration",
  "description": "Move core services to the new infra.",
  "status": "active",
  "priority": "high",
  "start_date": "2026-09-01",
  "due_date": "2026-12-15"
}
// Response 201
{
  "id": "b7e4...", "organization_id": "3a2b...", "name": "Platform Migration",
  "description": "Move core services to the new infra.", "owner_id": "9f1c...",
  "status": "active", "priority": "high", "start_date": "2026-09-01",
  "due_date": "2026-12-15", "created_at": "2026-09-23T10:00:00Z",
  "updated_at": "2026-09-23T10:00:00Z"
}
```

### `GET /api/tasks?status=todo&priority=high&page=1`
```json
// Response 200
{
  "items": [
    {
      "id": "c1d2...", "project_id": "b7e4...", "title": "Fix login redirect bug",
      "description": "Redirect loop on expired session.", "status": "todo",
      "priority": "high", "assignee_id": "9f1c...", "reporter_id": "e5f6...",
      "due_date": "2026-09-30",
      "labels": [{"id": "l1", "name": "bug", "color": "#A3453A"}],
      "created_at": "2026-09-20T14:00:00Z", "updated_at": "2026-09-20T14:00:00Z"
    }
  ],
  "total": 1, "page": 1, "page_size": 20
}
```

### `PATCH /api/tasks/{id}`
```json
// Request (partial — only fields being changed)
{ "status": "in_progress", "assignee_id": "9f1c..." }
// Response 200 — full TaskOut, updated
```

### `POST /api/incidents`
```json
// Request
{
  "title": "Database connection pool exhausted",
  "description": "API returning 500s under load, pool maxed at 20 connections.",
  "severity": "sev2",
  "assigned_team": "Engineering"
}
// Response 201
{
  "id": "d3e4...", "organization_id": "3a2b...",
  "title": "Database connection pool exhausted", "severity": "sev2",
  "status": "detected", "assigned_team": "Engineering", "assigned_user_id": null,
  "created_at": "2026-09-23T11:00:00Z", "updated_at": "2026-09-23T11:00:00Z",
  "resolved_at": null
}
```

### `PATCH /api/incidents/{id}` (status change)
```json
// Request
{ "status": "investigating" }
// Response 200 — updated IncidentOut
// Side effect (not in response body): an incident_events row is written:
//   {event_type: "status_changed", description: "Status changed from
//    'detected' to 'investigating'", metadata: {from: "detected", to: "investigating"}}
```

### `GET /api/incidents/{id}/events`
```json
// Response 200
{
  "items": [
    {"id": "ev1", "event_type": "created", "actor_id": "9f1c...",
     "description": "Incident created", "metadata": null,
     "created_at": "2026-09-23T11:00:00Z"},
    {"id": "ev2", "event_type": "status_changed", "actor_id": "9f1c...",
     "description": "Status changed from 'detected' to 'investigating'",
     "metadata": {"from": "detected", "to": "investigating"},
     "created_at": "2026-09-23T11:15:00Z"}
  ]
}
```

### `POST /api/approvals`
```json
// Request
{
  "title": "Production Deployment — v2.4.0",
  "description": "Deploy the September release to prod.",
  "steps": [
    {"approver_ids": ["daniel-patel-id"]},
    {"approver_ids": ["maya-singh-id"]}
  ]
}
// Response 201
{
  "id": "f4a5...", "title": "Production Deployment — v2.4.0",
  "status": "pending", "current_step_order": 1,
  "steps": [
    {"id": "s1", "step_order": 1, "status": "pending", "approver_ids": ["daniel-patel-id"]},
    {"id": "s2", "step_order": 2, "status": "pending", "approver_ids": ["maya-singh-id"]}
  ]
}
```

### `POST /api/approvals/{id}/steps/{step_id}/decide`
```json
// Request (approve)
{ "decision": "approved", "comment": "Looks good, tests pass." }
// Response 200
{
  "step": {"id": "s1", "status": "approved", "decided_by": "daniel-patel-id",
           "decided_at": "2026-09-23T12:00:00Z", "comment": "Looks good, tests pass."},
  "approval": {"id": "f4a5...", "status": "pending", "current_step_order": 2}
}

// Request (reject — comment required)
{ "decision": "rejected", "comment": "Migration script untested on staging." }
// Response 200
{
  "step": {"id": "s1", "status": "rejected", ...},
  "approval": {"id": "f4a5...", "status": "rejected", "current_step_order": 1}
  // step 2 is auto-marked "skipped" server-side
}

// Response 403 (not a named approver on the active step)
{ "detail": "You are not an approver on the current step", "code": "NOT_AN_APPROVER" }
```

### `POST /api/documents` (multipart/form-data)
```
// Request (multipart fields)
file: <binary>
project_id: "b7e4..."   (optional)
incident_id: null

// Response 201
{
  "id": "g5b6...", "filename": "deployment-checklist.pdf",
  "content_type": "application/pdf", "size_bytes": 84213,
  "uploaded_by": "9f1c...", "project_id": "b7e4...", "incident_id": null,
  "created_at": "2026-09-23T13:00:00Z"
}
// Response 413
{ "detail": "File exceeds 10MB limit", "code": "FILE_TOO_LARGE" }
// Response 422
{ "detail": "File type not allowed", "code": "INVALID_FILE_TYPE" }
```

### `GET /api/notifications/unread-count`
```json
// Response 200
{ "unread_count": 3 }
```

### `GET /api/billing/usage`
```json
// Response 200
{ "users_used": 5, "user_limit": 100, "projects_used": 3, "project_limit": 100 }
```

### `GET /api/audit?resource_type=incident&resource_id=d3e4...`
```json
// Response 200
{
  "items": [
    {"id": "a1", "actor_id": "9f1c...", "action": "incident.created",
     "resource_type": "incident", "resource_id": "d3e4...",
     "metadata": {"severity": "sev2"}, "created_at": "2026-09-23T11:00:00Z"},
    {"id": "a2", "actor_id": "9f1c...", "action": "incident.status_changed",
     "resource_type": "incident", "resource_id": "d3e4...",
     "metadata": {"from": "detected", "to": "investigating"},
     "created_at": "2026-09-23T11:15:00Z"}
  ],
  "total": 2, "page": 1, "page_size": 20
}
```

Apply this same example-pair pattern (one realistic request + one realistic
response, plus at least one realistic error response) to every remaining
route in section 19's table not shown above — `auth/refresh`, `auth/logout`,
`auth/forgot-password`, `auth/reset-password`, `organizations/*`,
`projects/{id}/members`, `tasks/{id}/comments`, `incidents/{id}/tasks`,
`integrations/{provider}`, `billing/subscription`. The shape is always: real
field names from section 18.2/25, real seeded-data-style values (use the
seeded Acme Technologies names/ids from section 21 as example values so the
examples are internally consistent with what Phase 18 actually seeds).

---

## 27. FRONTEND COMPONENT SPECS (props / state)

Pattern for every page component: a page component fetches data via a
TanStack Query hook and renders one of `Loading | Error | Empty | Content`;
presentational components underneath are pure/props-driven, no data fetching
inside them. Two representative pages shown in full below — apply the same
prop-drilling discipline to every other page in section 6.

### `pages/Tasks/TasksPage.tsx`
```tsx
// State: local filter state (react-router search params, not Zustand —
// filters are shareable via URL, not global app state)
const [filters, setFilters] = useSearchParams();
// { status?, priority?, assignee_id?, project_id?, search?, sort?, page? }

const { data, isPending, isError, refetch } = useTasksQuery(filters);
// useTasksQuery: TanStack Query hook in hooks/useTasksQuery.ts, wraps
// api/tasks.ts#listTasks(filters), queryKey = ["tasks", filters]

const [openTaskId, setOpenTaskId] = useState<string | null>(null);
// drives the TaskDetailDrawer open/closed + which task it shows

if (isPending) return <TaskTableSkeleton rows={8} />;
if (isError) return <ErrorState message="Couldn't load tasks." onRetry={refetch} />;
if (data.items.length === 0 && !hasActiveFilters(filters))
  return <EmptyState title="No tasks yet" actionLabel="Create task" onAction={openCreateModal} />;

return (
  <>
    <TaskFilterBar filters={filters} onChange={setFilters} />
    <TaskTable
      tasks={data.items}
      onRowClick={(taskId) => setOpenTaskId(taskId)}
      onStatusChange={(taskId, status) => statusMutation.mutate({ taskId, status })}
    />
    <Pagination page={data.page} total={data.total} pageSize={data.page_size}
                onPageChange={(p) => setFilters({...filters, page: p})} />
    {openTaskId && (
      <TaskDetailDrawer taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    )}
  </>
);
```

**`TaskTable` props:**
```ts
type TaskTableProps = {
  tasks: TaskOut[];
  onRowClick: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  sortBy?: { field: string; direction: "asc" | "desc" };
  onSortChange?: (field: string) => void;
};
```

**`TaskFilterBar` props:**
```ts
type TaskFilterBarProps = {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  projectOptions: { id: string; name: string }[]; // fetched via useProjectsQuery({minimal: true})
};
```

**`TaskDetailDrawer` props/state:**
```ts
type TaskDetailDrawerProps = { taskId: string; onClose: () => void };
// Internal: useTaskQuery(taskId) for the task itself,
// useTaskCommentsQuery(taskId) for the comment thread,
// useTaskActivityQuery(taskId) (audit logs filtered to this resource) for history tab.
// Local state: activeTab: "details" | "comments" | "activity"; commentDraft: string
```

### `pages/IncidentDetail/IncidentDetailPage.tsx`
```tsx
const { id } = useParams();
const { data: incident, isPending, isError, refetch } = useIncidentQuery(id);
const { data: events } = useIncidentEventsQuery(id);
const { data: comments } = useIncidentCommentsQuery(id);

// Local state
const [commentDraft, setCommentDraft] = useState("");
const [reassignOpen, setReassignOpen] = useState(false);

// Derived: legal next statuses for the status <Select>, computed from
// INCIDENT_STATUS_ORDER (mirrors backend, imported from a shared types file
// generated/hand-kept in sync with app/models/incident.py's ordering)
const nextStatusOptions = getLegalNextStatuses(incident?.status);

if (isPending) return <IncidentDetailSkeleton />;
if (isError) return <ErrorState message="Couldn't load incident." onRetry={refetch} />;

return (
  <div className="grid grid-cols-3 gap-6">
    <div className="col-span-2">
      <IncidentHeader incident={incident}
        onStatusChange={(status) => statusMutation.mutate(status)}
        nextStatusOptions={nextStatusOptions} />
      <IncidentTimeline events={events ?? []} />
      <CommentThread comments={comments ?? []} draft={commentDraft}
        onDraftChange={setCommentDraft}
        onSubmit={() => commentMutation.mutate(commentDraft)} />
    </div>
    <div className="col-span-1">
      <IncidentSidebar incident={incident} onReassign={() => setReassignOpen(true)} />
      <RelatedTasksList incidentId={id} />
      <IncidentDocumentsList incidentId={id} />
    </div>
    {reassignOpen && (
      <ReassignModal incidentId={id} onClose={() => setReassignOpen(false)} />
    )}
  </div>
);
```

**`IncidentTimeline` props:**
```ts
type IncidentTimelineProps = { events: IncidentEventOut[] };
// Pure rendering: maps event_type -> icon + colour (created=Info,
// status_changed=Leather, comment_added=Taupe, document_attached=Khaki,
// task_linked=Success), renders description + relative timestamp.
```

Apply this same "page component owns queries + top-level state, child
components are props-only" pattern to the remaining 14 pages in section 6 —
Projects/ProjectDetail mirror TasksPage's list+drawer shape; Approvals
mirrors IncidentDetail's header+stepper+comments shape; Team/Integrations/
Billing/Settings/Profile are simpler single-query pages with a form.

---

## 28. FIELD VALIDATION RULES

Consolidated table — the authoritative validation spec. Backend enforces via
Pydantic (`Field(...)`/`field_validator`), frontend mirrors via `zod` so
form errors surface before a round-trip; backend is the source of truth,
frontend validation is a UX convenience only, never trusted as the actual
enforcement layer (see section 35 for the full security requirements list).

| Field | Rule |
|---|---|
| `user.name` | 1–255 chars, required, trimmed |
| `user.email` | valid email format (RFC 5322 subset), 1–255 chars, unique, lowercased before storage |
| `user.password` (signup/reset) | min 8 chars, must contain at least one letter and one digit |
| `organization.name` | 1–255 chars, required, trimmed |
| `project.name` | 1–255 chars, required |
| `project.description` | max 10,000 chars, optional |
| `project.start_date`/`due_date` | valid ISO date; if both present, `due_date >= start_date` (422 otherwise) |
| `task.title` | 1–255 chars, required, trimmed, cannot be blank/whitespace-only |
| `task.description` | max 10,000 chars, optional |
| `task.due_date` | valid ISO date, optional |
| `label.name` | 1–50 chars, required, unique per organization |
| `label.color` | must match `^#[0-9A-Fa-f]{6}$` |
| `comment.body` | 1–5,000 chars, required, trimmed |
| `incident.title` | 1–255 chars, required |
| `incident.description` | max 10,000 chars, optional |
| `incident.severity` | must be one of `sev1..sev4` |
| `incident.status` transition | must be a forward move in `INCIDENT_STATUS_ORDER`, or an explicit "reopen" action (documented exception) — backend rejects an arbitrary backward jump with 422 |
| `approval.title` | 1–255 chars, required |
| `approval.steps` | at least 1 step required; each step needs at least 1 `approver_id`; `approver_id`s must belong to the same organization (else 422) |
| `approval decision.comment` | required (min 1 char) when `decision == "rejected"`; optional (max 2,000 chars) when `decision == "approved"` |
| `document` upload | max 10MB (`MAX_UPLOAD_SIZE_MB` env var); extension in allowlist (section 12); content-type + magic-byte cross-check must agree with the allowlist entry |
| `invite.email` | valid email format; if a Membership already exists for that email in the org, 409 |
| `invite.role` | must be one of the 5 role enum values; cannot invite as `owner` (Owner is set only at org creation — Admin can promote someone to Owner later via a separate, explicit "transfer ownership" action if built, not via the invite form) |
| `notification.type` | server-set only, never client-supplied |
| `subscription.plan` | must be one of `free/starter/business/enterprise` |
| pagination `page` | integer ≥ 1, default 1 |
| pagination `page_size` | integer 1–100, default 20 |

---

## 30. REMAINING SQLALCHEMY MODELS — FULL CODE

The five models section 24 deferred, written out in full.

```python
# app/models/document.py
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin

class Document(Base, UUIDPKMixin):
    __tablename__ = "documents"

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"))
    project_id: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("projects.id"), nullable=True, index=True)
    incident_id: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("incidents.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
```

```python
# app/models/notification.py
import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum, Index, func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin

class NotificationType(str, enum.Enum):
    task_assigned = "task_assigned"
    incident_assigned = "incident_assigned"
    approval_requested = "approval_requested"
    approval_decided = "approval_decided"
    comment_added = "comment_added"
    team_invited = "team_invited"
    project_activity = "project_activity"

class Notification(Base, UUIDPKMixin):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_user_read", "user_id", "read"),)

    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"), index=True)
    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(String(500), nullable=True)
    link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
```

```python
# app/models/integration.py
import enum
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Enum, JSON, UniqueConstraint
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin

class IntegrationProvider(str, enum.Enum):
    github = "github"; slack = "slack"; google_drive = "google_drive"
    jira = "jira"; pagerduty = "pagerduty"

class Integration(Base, UUIDPKMixin):
    __tablename__ = "integrations"
    __table_args__ = (UniqueConstraint("organization_id", "provider"),)

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    provider: Mapped[IntegrationProvider] = mapped_column(Enum(IntegrationProvider), nullable=False)
    connected: Mapped[bool] = mapped_column(Boolean, default=False)
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    connected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
```

```python
# app/models/subscription.py
import enum
from sqlalchemy import Integer, ForeignKey, Enum
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin, TimestampMixin

class Plan(str, enum.Enum):
    free = "free"; starter = "starter"; business = "business"; enterprise = "enterprise"

class SubscriptionStatus(str, enum.Enum):
    active = "active"; past_due = "past_due"; canceled = "canceled"

PLAN_LIMITS = {
    Plan.free:       {"user_limit": 5,   "project_limit": 3},
    Plan.starter:    {"user_limit": 20,  "project_limit": 15},
    Plan.business:   {"user_limit": 100, "project_limit": 100},
    Plan.enterprise: {"user_limit": 10_000, "project_limit": 10_000},
}

class Subscription(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "subscriptions"

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), unique=True)
    plan: Mapped[Plan] = mapped_column(Enum(Plan), default=Plan.free)
    status: Mapped[SubscriptionStatus] = mapped_column(Enum(SubscriptionStatus), default=SubscriptionStatus.active)
    user_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    project_limit: Mapped[int] = mapped_column(Integer, nullable=False)
```

```python
# app/models/audit_log.py
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, JSON, Index, func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin

class AuditLog(Base, UUIDPKMixin):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_org_created", "organization_id", "created_at"),
        Index("ix_resource", "resource_type", "resource_id"),
    )

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"))
    actor_id: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(36), nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
```

`invites` table (referenced in section 18.2 for the invite flow but not yet
modeled — added here):

```python
# app/models/invite.py
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPKMixin
from app.models.membership import RoleEnum

class Invite(Base, UUIDPKMixin):
    __tablename__ = "invites"

    organization_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("organizations.id"), index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    invited_by: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"))
```

---

## 31. REMAINING PYDANTIC SCHEMAS — FULL CODE

```python
# app/schemas/auth.py
from pydantic import BaseModel, EmailStr, Field, field_validator
import re

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)
    organization_name: str = Field(..., min_length=1, max_length=255)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("password must contain at least one letter and one digit")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    model_config = {"from_attributes": True}

class OrganizationOut(BaseModel):
    id: str
    name: str
    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    user: UserOut
    organization: OrganizationOut
```

```python
# app/schemas/organization.py
from pydantic import BaseModel, EmailStr, Field
from app.models.membership import RoleEnum

class InviteCreate(BaseModel):
    email: EmailStr
    role: RoleEnum = RoleEnum.member

class InviteOut(BaseModel):
    id: str
    email: str
    role: RoleEnum
    expires_at: str
    model_config = {"from_attributes": True}

class MembershipOut(BaseModel):
    # NOTE: user_name/user_email live on the related User, not on Membership
    # itself — plain `.model_validate(membership)` will NOT populate them.
    # Build via the classmethod below (service loads `membership.user` first,
    # e.g. via `selectinload(Membership.user)` to avoid N+1 queries).
    id: str
    user_id: str
    user_name: str
    user_email: str
    role: RoleEnum
    joined_at: str

    @classmethod
    def from_membership(cls, m: "Membership") -> "MembershipOut":
        return cls(id=m.id, user_id=m.user_id, user_name=m.user.name,
                    user_email=m.user.email, role=m.role,
                    joined_at=m.joined_at.isoformat())

class MembershipRoleUpdate(BaseModel):
    role: RoleEnum

class OrganizationUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
```

```python
# app/schemas/project.py
from datetime import date, datetime
from pydantic import BaseModel, Field, model_validator
from app.models.project import ProjectStatus, Priority

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    status: ProjectStatus = ProjectStatus.active
    priority: Priority = Priority.medium
    start_date: date | None = None
    due_date: date | None = None

    @model_validator(mode="after")
    def dates_ordered(self):
        if self.start_date and self.due_date and self.due_date < self.start_date:
            raise ValueError("due_date must be on or after start_date")
        return self

class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: ProjectStatus | None = None
    priority: Priority | None = None
    start_date: date | None = None
    due_date: date | None = None

class ProjectOut(BaseModel):
    # NOTE: member_count/task_count are not columns on Project — the service
    # computes them with a COUNT query (or a SQLAlchemy `column_property`/
    # subquery on the model) alongside the main fetch, then builds this
    # schema explicitly. Do not attempt a bare `.model_validate(project)`.
    id: str
    name: str
    description: str | None
    owner_id: str
    status: ProjectStatus
    priority: Priority
    start_date: date | None
    due_date: date | None
    member_count: int
    task_count: int
    created_at: datetime
    updated_at: datetime
```

```python
# app/schemas/incident.py
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.incident import Severity, IncidentStatus, IncidentEventType

class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    severity: Severity
    assigned_team: str | None = Field(None, max_length=100)
    assigned_user_id: str | None = None

class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: Severity | None = None
    status: IncidentStatus | None = None
    assigned_team: str | None = None
    assigned_user_id: str | None = None

class IncidentOut(BaseModel):
    id: str
    title: str
    description: str | None
    severity: Severity
    status: IncidentStatus
    assigned_team: str | None
    assigned_user_id: str | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None
    model_config = {"from_attributes": True}

class IncidentEventOut(BaseModel):
    id: str
    event_type: IncidentEventType
    actor_id: str
    description: str
    metadata: dict | None = Field(None, alias="metadata_json")
    created_at: datetime
    model_config = {"from_attributes": True, "populate_by_name": True}
```

```python
# app/schemas/approval.py
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, model_validator
from app.models.approval import ApprovalStatus, ApprovalStepStatus

class ApprovalStepCreate(BaseModel):
    approver_ids: list[str] = Field(..., min_length=1)

class ApprovalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=10_000)
    steps: list[ApprovalStepCreate] = Field(..., min_length=1)

class ApprovalStepOut(BaseModel):
    # NOTE: approver_ids is derived from the step.approvers relationship
    # (list[User]) added in section 24's ApprovalStep model — build via the
    # classmethod below, not a bare `.model_validate(step)`.
    id: str
    step_order: int
    status: ApprovalStepStatus
    approver_ids: list[str]
    decided_by: str | None
    decided_at: datetime | None
    comment: str | None

    @classmethod
    def from_step(cls, s: "ApprovalStep") -> "ApprovalStepOut":
        return cls(id=s.id, step_order=s.step_order, status=s.status,
                    approver_ids=[u.id for u in s.approvers],
                    decided_by=s.decided_by, decided_at=s.decided_at,
                    comment=s.comment)

class ApprovalOut(BaseModel):
    id: str
    title: str
    description: str | None
    requester_id: str
    status: ApprovalStatus
    current_step_order: int
    steps: list[ApprovalStepOut]
    created_at: datetime

    @classmethod
    def from_approval(cls, a: "Approval") -> "ApprovalOut":
        return cls(id=a.id, title=a.title, description=a.description,
                    requester_id=a.requester_id, status=a.status,
                    current_step_order=a.current_step_order,
                    steps=[ApprovalStepOut.from_step(s) for s in a.steps],
                    created_at=a.created_at)

class ApprovalDecisionRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    comment: str | None = Field(None, max_length=2_000)

    @model_validator(mode="after")
    def comment_required_on_reject(self):
        if self.decision == "rejected" and not (self.comment and self.comment.strip()):
            raise ValueError("comment is required when rejecting a step")
        return self
```

```python
# app/schemas/document.py
from datetime import datetime
from pydantic import BaseModel

class DocumentOut(BaseModel):
    id: str
    filename: str
    content_type: str
    size_bytes: int
    uploaded_by: str
    project_id: str | None
    incident_id: str | None
    created_at: datetime
    model_config = {"from_attributes": True}
```

```python
# app/schemas/notification.py
from datetime import datetime
from pydantic import BaseModel
from app.models.notification import NotificationType

class NotificationOut(BaseModel):
    id: str
    type: NotificationType
    title: str
    body: str | None
    link: str | None
    read: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class UnreadCountOut(BaseModel):
    unread_count: int
```

```python
# app/schemas/integration.py
from datetime import datetime
from pydantic import BaseModel
from app.models.integration import IntegrationProvider

class IntegrationUpdate(BaseModel):
    connected: bool
    config: dict | None = None

class IntegrationOut(BaseModel):
    provider: IntegrationProvider
    connected: bool
    config: dict | None
    connected_at: datetime | None
    model_config = {"from_attributes": True}
```

```python
# app/schemas/billing.py
from pydantic import BaseModel
from app.models.subscription import Plan, SubscriptionStatus

class SubscriptionOut(BaseModel):
    plan: Plan
    status: SubscriptionStatus
    user_limit: int
    project_limit: int
    model_config = {"from_attributes": True}

class SubscriptionUpdate(BaseModel):
    plan: Plan

class UsageOut(BaseModel):
    users_used: int
    user_limit: int
    projects_used: int
    project_limit: int
```

```python
# app/schemas/audit.py
from datetime import datetime
from pydantic import BaseModel

class AuditLogOut(BaseModel):
    id: str
    actor_id: str | None
    action: str
    resource_type: str
    resource_id: str
    metadata: dict | None
    created_at: datetime
    model_config = {"from_attributes": True}
```

---

## 32. REMAINING FRONTEND PAGE COMPONENT SPECS

Same discipline as section 27: page owns queries + top-level state, children
are props-only. One block per remaining page.

### `pages/Landing/LandingPage.tsx`
No queries, no auth required. State: none (static marketing content).
Components: `Hero`, `FeatureGrid` (4 cards: Projects/Tasks, Incidents,
Approvals, Documents+Team), `CTASection` with links to `/signup` `/login`.

### `pages/Login/LoginPage.tsx`
```tsx
const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });
const loginMutation = useMutation({
  mutationFn: (values: LoginFormValues) => authApi.login(values),
  onSuccess: (data) => { authStore.setSession(data); navigate("/dashboard"); },
  onError: (err) => setServerError(err.detail ?? "Login failed"),
});
// State: serverError: string | null (banner above the form)
```
`LoginForm` props: `{ onSubmit: (values) => void; isSubmitting: boolean; serverError: string | null }`.

### `pages/Signup/SignupPage.tsx`
Same shape as Login, extra fields (`name`, `organization_name`), calls
`authApi.signup`. Field-level errors mapped from the 422 `fields` shape
(section 12.4) onto `react-hook-form`'s `setError`.

### `pages/Dashboard/DashboardPage.tsx`
```tsx
const [range, setRange] = useState<"today" | "7d" | "30d">("7d");
const { data: myTasks } = useTasksQuery({ status: "open", assignee_id: "me" });
const { data: activeIncidents } = useIncidentsQuery({ status: "active" });
const { data: pendingApprovals } = useApprovalsQuery({ filter: "mine" });
const { data: projects } = useProjectsQuery({});
const { data: activity } = useAuditQuery({ since: range });
const { data: notifications } = useNotificationsQuery({ unread: true, page_size: 5 });

// Each KPI card and each list section renders its own loading/error/empty
// independently (partial-failure tolerant — one slow/broken query must not
// blank the whole dashboard). See <DashboardCard> below.
```
`DashboardCard` props: `{ title: string; isPending: boolean; isError: boolean; isEmpty: boolean; emptyLabel: string; children: ReactNode }` — wraps each section (Open Tasks, Active Incidents, Pending Approvals, Projects, Recent Activity, Team Activity, Notifications) so a single failed query degrades gracefully instead of crashing the page.

### `pages/Projects/ProjectsPage.tsx`
Mirrors `TasksPage` exactly (section 27): filter bar (status, priority),
`ProjectCard` grid (or `ProjectTable` toggle via local `view: "grid"|"table"`
state persisted in `localStorage` as a per-viewer convenience only),
"New Project" modal (Manager+ gated via `useAuthStore().role`).

### `pages/ProjectDetail/ProjectDetailPage.tsx`
```tsx
const { id } = useParams();
const { data: project } = useProjectQuery(id);
const [activeTab, setActiveTab] = useState<"overview"|"tasks"|"members"|"activity">("overview");
// Tabs render independently-queried content:
// overview -> ProjectOverview (uses `project` already fetched)
// tasks -> reuses <TaskTable> from section 27, pre-filtered project_id=id
// members -> <ProjectMembersList projectId={id} canEdit={role >= manager} />
// activity -> <ActivityFeed resourceType="project" resourceId={id} />
```

### `pages/Approvals/ApprovalsPage.tsx`
```tsx
const [tab, setTab] = useState<"awaiting_me"|"my_requests"|"all">("awaiting_me");
const { data } = useApprovalsQuery({ filter: tab });
const [openApprovalId, setOpenApprovalId] = useState<string|null>(null);
// List renders <ApprovalRow> (title, requester, ApprovalStepper mini-preview,
// current step's approver names); click opens <ApprovalDetailModal approvalId />
```
`ApprovalStepper` props: `{ steps: ApprovalStepOut[]; currentStepOrder: number; compact?: boolean }` — `compact` renders the small inline preview used in `ApprovalRow`; full size used inside `ApprovalDetailModal`.
`ApprovalDetailModal` internal state: `decisionComment: string`; renders decide buttons only if `currentUser.id` is in the active step's `approver_ids` AND role ≥ Manager (both checks — see section 7.1's approval row).

### `pages/Documents/DocumentsPage.tsx`
```tsx
const [filters, setFilters] = useState<{project_id?: string; incident_id?: string}>({});
const { data } = useDocumentsQuery(filters);
const uploadMutation = useMutation({ mutationFn: documentsApi.upload });
// <DocumentUploader onFilesSelected={(files) => files.forEach(f => uploadMutation.mutate({file: f, ...filters}))} />
// <DocumentList documents={data.items} onDownload={documentsApi.download} onDelete={(id) => deleteMutation.mutate(id)} />
```

### `pages/Notifications/NotificationsPage.tsx`
```tsx
const { data, refetch } = useNotificationsQuery({ page });
const markReadMutation = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: refetch });
const markAllMutation = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: refetch });
// List of <NotificationRow notification={n} onClick={() => { markReadMutation.mutate(n.id); navigate(n.link); }} />
```
`NotificationBell` (top bar, separate from this page): polls
`useUnreadCountQuery()` with `refetchInterval: 30_000`, shows a dropdown
preview (`page_size: 5`) reusing `NotificationRow`.

### `pages/Team/TeamPage.tsx`
```tsx
const { data: members } = useMembersQuery();
const inviteMutation = useMutation({ mutationFn: organizationsApi.invite });
const roleMutation = useMutation({ mutationFn: organizationsApi.updateRole });
const removeMutation = useMutation({ mutationFn: organizationsApi.removeMember });
const canManage = useAuthStore(s => ["owner","admin"].includes(s.role));
// <MemberTable members={members} canManage={canManage}
//    onRoleChange={(userId, role) => roleMutation.mutate({userId, role})}
//    onRemove={(userId) => removeMutation.mutate(userId)} />
// {canManage && <InviteForm onSubmit={(v) => inviteMutation.mutate(v)} />}
```

### `pages/Integrations/IntegrationsPage.tsx`
```tsx
const { data: integrations } = useIntegrationsQuery();
const toggleMutation = useMutation({ mutationFn: integrationsApi.update });
// grid of <IntegrationCard integration={i} onToggle={() => toggleMutation.mutate({provider: i.provider, connected: !i.connected})} />
```
`IntegrationCard` props: `{ integration: IntegrationOut; onToggle: () => void; canManage: boolean }`.

### `pages/Billing/BillingPage.tsx`
```tsx
const { data: subscription } = useSubscriptionQuery();
const { data: usage } = useUsageQuery();
const updateMutation = useMutation({ mutationFn: billingApi.updateSubscription });
const canManage = useAuthStore(s => ["owner","admin"].includes(s.role));
// <UsageBar label="Users" used={usage.users_used} limit={usage.user_limit} />
// <UsageBar label="Projects" used={usage.projects_used} limit={usage.project_limit} />
// <PlanComparisonTable currentPlan={subscription.plan} onSelect={canManage ? (p) => updateMutation.mutate({plan: p}) : undefined} />
```

### `pages/Settings/SettingsPage.tsx`
```tsx
const { data: org } = useOrganizationQuery();
const canEdit = useAuthStore(s => ["owner","admin"].includes(s.role));
const updateMutation = useMutation({ mutationFn: organizationsApi.update });
// canEdit ? <OrgSettingsForm org={org} onSubmit={(v) => updateMutation.mutate(v)} />
//         : <ReadOnlyOrgSettings org={org} />
```

### `pages/Profile/ProfilePage.tsx`
```tsx
const { data: me } = useMeQuery();
const updateMutation = useMutation({ mutationFn: usersApi.updateMe });
const passwordMutation = useMutation({ mutationFn: usersApi.changePassword });
// <ProfileForm user={me} onSubmit={(v) => updateMutation.mutate(v)} />
// <ChangePasswordForm onSubmit={(v) => passwordMutation.mutate(v)} />
```

---

## 33. INDEX

```
0.  Locked spec (stack/paths/ports)              §0
2.  Design system / colour tokens                §2
6.  Page-by-page frontend spec                    §6
7.  Role permission matrix                        §7
11. Approval state machine semantics              §11
12.4 Shared API error-shape convention            §12.4
18. Database schema (table listing)               §18
19. API route table                               §19
23. Implementation phases 0-21                    §23
24. SQLAlchemy models (core tables)               §24
25. Pydantic schemas (Tasks, full pattern)        §25
26. Endpoint request/response JSON examples       §26
27. Frontend component specs (Tasks, Incidents)   §27
28. Field validation rules table                  §28
30. Remaining SQLAlchemy models (5 tables+invite) §30
31. Remaining Pydantic schemas (all domains)      §31
32. Remaining page component specs (14 pages)     §32
33. This index                                    §33
34. Implementation instructions for Claude        §34
35. Security requirements (mandatory checklist)   §35
BUILD STATE — phase checklist + status log
```

---

## 34. IMPLEMENTATION INSTRUCTIONS FOR CLAUDE

1. Read this entire `BUILD_PLAN.md` before writing any code.
2. Inspect the existing workspace: does `flowdesk/backend` or
   `flowdesk/frontend` already contain code? Check `BUILD STATE` below for
   the last recorded phase.
3. If mid-implementation, resume from the first phase not yet checked off
   in `BUILD STATE` — do not restart from Phase 0 and do not rebuild
   working components unnecessarily. Inspect existing files to confirm
   they actually match this spec before trusting a checkmark; if drift is
   found, fix it and note it in `KNOWN ISSUES` rather than silently
   diverging further.
4. Inspect available ports and local MySQL per Phase 0 before assuming the
   defaults in section 0.1 are free.
5. **Never modify anything under
   `C:\Users\Sharrvin\OneDrive\Documents\GitHub\fantom.ai`** — no source,
   no `.env`, no ports, no dependencies, no containers.
6. Follow the phases in section 23 in order; each phase's completion
   criteria must actually be true (run the commands, don't assume) before
   moving to the next.
7. Actually create and modify files — this document describes the target,
   it is not itself the implementation.
8. Run commands where appropriate (migrations, seed, dev servers, tests) —
   don't just describe what should be run.
9. Fix errors encountered rather than stopping at the first failure;
   only stop and ask the user if genuinely blocked on a decision this
   document doesn't answer (rare — most decisions are locked above).
10. After completing or making meaningful progress in a phase, update the
    `BUILD STATE` section below (checklist + CURRENT STATUS / COMPLETED /
    IN PROGRESS / NEXT STEPS / KNOWN ISSUES) so a future session can
    resume correctly. This document is a living state file, not just a
    spec — keep it in sync with reality as you go.
11. Do not introduce an alternative stack, colour palette, or role/
    approval/notification semantics — those are locked in sections 0, 2,
    7, and 11.

---

## 35. SECURITY REQUIREMENTS (mandatory — verify each before Phase 21 sign-off)

Referenced from section 22 (Testing) and section 28 (Field Validation) —
this is the authoritative list, apply during the phase that builds each
piece (noted below), don't defer all of this to the end.

1. **Password hashing** — bcrypt cost factor 12 via `passlib[bcrypt]`. Never
   log, return, or include the hash in any API response (`UserOut` in
   section 31 deliberately excludes it). *(Phase 4)*
2. **JWT** — access token 15 min expiry, signing secret from `JWT_SECRET`
   env var, minimum 32 random bytes, never committed to git. Refresh token
   is a random opaque value (not a JWT), delivered only via an
   `httpOnly; Secure; SameSite=Strict` cookie — never stored in
   `localStorage`/`sessionStorage` on the frontend (XSS exfiltration risk).
   *(Phase 4)*
3. **SQL injection** — all queries go through SQLAlchemy's parameterized
   query builder; raw `text()`/`execute()` with string-interpolated values
   is banned anywhere in the codebase. *(Phase 3 onward, all services)*
4. **IDOR (insecure direct object reference)** — every query for an
   org-scoped resource (project, task, incident, approval, document, etc.)
   filters by `organization_id` taken from the authenticated user's JWT/
   membership, never from a client-supplied path or body parameter. A
   `require_org_scope` pattern in `deps.py` should make this the default,
   not something each router remembers to add. *(every domain phase,
   5 through 17)*
5. **File upload validation** — enforced exactly as specified in section 12:
   10MB max, extension allowlist, content-type + magic-byte cross-check,
   UUID-generated storage filename (never the user-supplied name — blocks
   path traversal), downloads served only through the authenticated
   `GET /api/documents/{id}/download` route, never a public static mount.
   *(Phase 12)*
6. **CORS** — `allow_origins=["http://localhost:5173"]` exactly (from
   `CORS_ORIGINS` env var), `allow_credentials=True` paired with that
   explicit origin — never `"*"` with credentials enabled. *(Phase 2)*
7. **Rate limiting** — `/api/auth/login`, `/api/auth/signup`, and
   `/api/auth/forgot-password` limited to 5 requests per 15 minutes per
   IP+email combination (`slowapi` or an equivalent in-memory limiter) to
   blunt credential-stuffing/brute-force attempts. *(Phase 4)*
8. **Input validation** — every request body validated server-side via
   Pydantic per section 28's rules table; unknown/extra fields rejected
   (`model_config = {"extra": "forbid"}` on request schemas); frontend zod
   validation is a UX convenience only, never the enforcement layer.
   *(every domain phase)*
9. **XSS** — React's default escaping is relied on for all rendered
   user content (comments, descriptions, titles); `dangerouslySetInnerHTML`
   is banned unless the content has been sanitized through DOMPurify first,
   and no current page in section 6/32 needs raw HTML rendering, so this
   should not come up. *(Phase 6 onward, frontend)*
10. **Secrets management** — `.env` files gitignored at the repo root;
    `.env.example` (section 20) contains placeholder values only; generate
    a real `JWT_SECRET` locally with
    `python -c "import secrets; print(secrets.token_urlsafe(32))"` and
    never commit the generated value. *(Phase 1)*
11. **Token integrity** — password-reset and invite tokens are
    cryptographically random (`secrets.token_urlsafe(32)`), stored as a
    SHA-256 hash (never the raw token) on the `users`/`invites` row,
    single-use (cleared/marked accepted on redemption), and expire (1 hour
    for reset, 24 hours for invite) per section 5.1/5.5. *(Phase 4/5)*
12. **Error responses** — in non-DEBUG runs, unhandled exceptions return a
    generic `{"detail": "Internal server error"}` with no stack trace or
    internal detail leaked to the client; the real exception is logged
    server-side only, via a FastAPI exception handler in `main.py`.
    *(Phase 2)*
13. **Dependency audit** — run `pip-audit` (backend) and `npm audit`
    (frontend) as part of Phase 19/21; resolve any High/Critical findings
    before marking the build done.

---

## BUILD STATE

```
[x] Phase 0  — Inspect environment
[x] Phase 1  — Initialize repository
[x] Phase 2  — Backend foundation
[x] Phase 3  — MySQL / database / migrations
[x] Phase 4  — Authentication
[x] Phase 5  — Organizations / RBAC
[x] Phase 6  — Frontend foundation
[x] Phase 7  — Dashboard
[x] Phase 8  — Projects
[x] Phase 9  — Tasks
[x] Phase 10 — Incidents
[x] Phase 11 — Approvals
[x] Phase 12 — Documents
[x] Phase 13 — Notifications
[x] Phase 14 — Team management
[x] Phase 15 — Integrations
[x] Phase 16 — Billing
[x] Phase 17 — Audit logs
[x] Phase 18 — Seed data
[x] Phase 19 — Testing
[ ] Phase 20 — UI polish
[x] Phase 21 — Final verification
```

## CURRENT STATUS

Feature-complete end to end. A prior session built the entire backend
(FastAPI, all 12 domains, all 22 tables, seed data, 36 passing pytest
tests) but left the frontend at the stock `npm create vite` scaffold
(zero pages/router/components) and never updated this tracker — it still
read "not started" despite the backend being nearly done. This session
built the entire frontend application layer from that scaffold (which had
a genuinely good head start: `api/client.ts` with the refresh interceptor,
5 domain api modules, zustand stores, and a fully-configured `fd-*`
Tailwind palette were already correct) and fixed a small number of real
backend gaps found along the way. The app now runs end-to-end: signup/
login, all 17 routes, full CRUD across every domain, the approval state
machine, incident lifecycle + timeline, document upload/download, live
notifications, and audit logging all verified working against the real
MySQL-backed API (see KNOWN ISSUES / verification notes below).

## COMPLETED

**Backend (this session):**
- Added a global unhandled-exception handler in `main.py` (security
  requirement §35.12 was the one item not yet wired) — returns a generic
  500 with no stack trace leak in non-DEBUG runs, logs server-side.
- Added a missing `GET /api/incidents/{id}/tasks` endpoint
  (`incident_service.list_linked_tasks`) — the incident_tasks join table
  and the `POST .../tasks` link action already existed, but nothing could
  list what was linked, which the Incident Detail page's "Related tasks"
  panel needs. Small, scoped addition on top of the existing pattern.
- Ran `alembic upgrade head` (already at head), confirmed all 22 tables,
  ran the seed script (already seeded from a prior session), ran the full
  pytest suite (36 passed), ran `pip-audit` (0 vulnerabilities).

**Frontend (this session, built from near-zero):**
- `lib/`: queryClient, format helpers (relative time, bytes, dates,
  initials), constants (role ranking + badge/status color maps).
- `hooks/`: useDebounce, usePagination.
- `components/ui/`: Button, Input/Textarea/Select (with proper
  label/htmlFor association for accessibility), Badge, Card, Avatar,
  Modal/Drawer, Tabs, Pagination, Toast, and the shared Loading/Error/
  Empty state components used by every list page.
- `components/layout/`: AppShell, Sidebar (role-gated nav), TopBar,
  ProtectedRoute.
- `components/activity/ActivityFeed.tsx`: the shared component from §17,
  reused on Dashboard / Project Detail / Incident Detail.
- Per-domain components: TaskTable/TaskFormModal/TaskDetailDrawer,
  ProjectFormModal/ProjectMembersList, IncidentTimeline/ReassignModal/
  RelatedTasksList/IncidentDocumentsList/IncidentFormModal,
  ApprovalStepper/ApprovalCreateModal/ApprovalDetailModal,
  DocumentUploader/DocumentList, NotificationBell (30s polling).
- All 17 routed pages from §6, plus 3 small utility auth pages the
  locked route table didn't enumerate but the backend already implements
  and needs a UI for: `/forgot-password`, `/reset-password`,
  `/invite/accept` (noted under KNOWN ISSUES — not a spec deviation,
  just filling in a route the backend requires).
- `router.tsx`, `App.tsx` (JWT-decode-based silent-refresh bootstrap on
  load, since `POST /api/auth/refresh` only returns an access token —
  `role`/`org_id` are read out of the JWT payload client-side, then
  `GET /api/users/me` + `GET /api/organizations/{org_id}` restore the
  rest of the session).
- Added Vitest + React Testing Library (devDependency, wasn't installed
  yet) and 4 test files per §22's list: `TaskTable.test.tsx`,
  `ApprovalStepper.test.tsx` (current-step highlighting), `TaskFormModal
  .test.tsx` (required-field validation), `LoginPage.test.tsx` (renders +
  401 error banner). 9/9 passing.
- `npm run build` succeeds with zero TypeScript errors, `npm audit`: 0
  vulnerabilities.

**Verified with a scripted API walkthrough** against the live backend
(not just unit tests): signup/login → create project → create task →
create incident → status transition (event written) → link task to
incident → create 2-step approval → approve step 1 as Daniel → approve
step 2 as Maya → approval.status becomes `approved` → upload a document
→ download it back byte-for-byte → notifications populated for both
approvers → audit log has the 3 expected entries → a Member role gets
403 creating a project. Full §22 E2E checklist, all green.

## IN PROGRESS

Phase 20 (UI polish) is intentionally left open — the app is functional
and visually consistent (fd-* palette applied everywhere, no default-
Tailwind-blue slipped in, loading/error/empty states are consistent via
the shared `<States>` components on every list page) but a dedicated
tablet-width (768px) responsive pass and a final visual QA sweep were
not done in this session, since no browser-automation tool was available
in this environment to actually look at the rendered UI (see KNOWN
ISSUES). Everything was verified by build success, Vitest, and live API
calls, not by eyes-on-screen review.

## NEXT STEPS

1. Open http://localhost:5173 in a real browser and eyeball the actual
   rendered UI — this session could not do this (no browser-control tool
   available) and relied on TypeScript/build/test/API verification
   instead. Both dev servers were left running: backend on :8001,
   frontend on :5173 (MySQL/XAMPP mysqld also left running).
2. Do the tablet-width (768px) responsive check called out in Phase 20.
3. Optionally add backend test coverage for documents/billing/
   integrations/audit — the locked §22 test list doesn't require these
   four, so they were left as-is, but they're currently untested.
4. Consider code-splitting (`dynamic import()`) if the ~545KB main JS
   chunk becomes a real concern — flagged by the Vite build, not fixed,
   since it's a non-issue at this app's scale for local/internal use.
5. This repo has never been committed to git — first commit is still
   pending (see KNOWN ISSUES).

## KNOWN ISSUES

- MySQL credentials confirmed: `root` / blank password via local XAMPP
  (`C:\xampp\mysql\bin\mysqld.exe`), matching the Phase 0 assumption.
  XAMPP's mysqld was not running as a service — this session started it
  directly (`mysqld.exe --standalone`); it is not registered as a
  Windows service, so it will need to be started the same way after a
  reboot.
- fantom.ai repo untouched — never opened, no overlap confirmed (different
  DB engine/ports as designed).
- The locked §6 route table doesn't list password-reset or invite-accept
  pages, but §5.1/§5.5 and the actual backend both implement
  forgot-password/reset-password/invite-accept flows. Added
  `/forgot-password`, `/reset-password`, `/invite/accept` as public
  routes so those backend features aren't dead ends in the UI. This is
  filling a gap, not a deviation from the locked design system/palette/
  role semantics.
- No browser-automation/screenshot tool was available in this session's
  environment, so the frontend was verified via `tsc` type-checking,
  `vite build`, Vitest component/page tests, and direct API integration
  testing — not by visually rendering the app. A visual pass (next
  session or the user) is the one meaningfully unverified piece.
- `backend/.env` contains a real (locally-generated) `JWT_SECRET` and is
  git-ignored — confirmed it won't be committed, but flagging since it's
  a live secret sitting on disk for local dev.
- This repo (`flowdesk/`) has zero git history — `git status` shows
  `BUILD_PLAN.md`, `backend/`, `frontend/` as untracked from the very
  first commit onward. No commit has been made by this session; the user
  did not ask for one.
