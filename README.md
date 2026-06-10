# Per Diem Management System

Enterprise multi-tenant SaaS platform for managing travel per diem requests, policies, approvals, and finance operations.

## Tech Stack

- **Backend**: NestJS (modular, clean architecture)
- **Frontend**: Next.js 15 (App Router)
- **UI**: TailwindCSS + shadcn/ui
- **Database**: MongoDB (Mongoose) — Phase 1+
- **Package Manager**: pnpm

## Project Structure

```
perdiem-management-system/
├── apps/
│   ├── backend/          # NestJS API
│   │   ├── src/
│   │   │   ├── common/           # Filters, interceptors, DTOs, exceptions
│   │   │   ├── infrastructure/   # Config, logging
│   │   │   └── modules/          # Feature modules
│   │   └── test/                 # E2E tests
│   └── frontend/         # Next.js App
│       └── src/
│           ├── app/              # App Router pages
│           ├── components/       # UI components
│           └── lib/              # API client, utilities
├── packages/             # Shared packages (future)
├── .env.example
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- MongoDB (required from Phase 1)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
```

### Development

```bash
# Run both API and frontend
pnpm dev

# Run API only
pnpm dev:api

# Run frontend only
pnpm dev:web
```

- API: http://localhost:3001/api/v1
- Frontend: http://localhost:3002

### Testing

```bash
# Run all tests
pnpm test

# Run backend tests only
pnpm test:api

# Run backend E2E tests
pnpm --filter @perdiem/backend test:e2e
```

## Phase 0 — Foundation (Complete)

- [x] pnpm monorepo workspace
- [x] NestJS project with clean architecture folders
- [x] Config system with environment validation
- [x] Winston structured logging
- [x] Global exception filters
- [x] Request ID middleware & tracing
- [x] Health check endpoints
- [x] Helmet security headers
- [x] Next.js frontend with API client
- [x] Unit & integration tests

## Phase 9 — Security Hardening (Complete)

- [x] Centralized security audit logs for auth, user management, and finance actions
- [x] IP, user agent, and request ID captured on every audit event
- [x] Tenant-scoped audit log API for tenant admins
- [x] Global per-IP rate limiting with stricter limits on auth endpoints
- [x] Health endpoints exempt from rate limiting
- [x] Frontend security audit logs page
- [x] Unit and E2E tests

### Security API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/security/audit-logs` | `security:audit_read` | List tenant security audit logs |

### Rate limiting

| Scope | Default | Config |
|-------|---------|--------|
| Global API | 100 req / 60s per IP | `RATE_LIMIT_MAX`, `RATE_LIMIT_TTL_MS` |
| Auth endpoints | 5–20 req / 60s per IP | `@RateLimit` per route |
| Health checks | Exempt | `@SkipRateLimit` |

## Phase 8 — Analytics (Complete)

- [x] Tenant-wide dashboard KPIs for managers and admins
- [x] Personal analytics summary for employees (scoped to own data)
- [x] Spend report with status and country breakdown
- [x] Optional date range filtering on reports
- [x] CSV export for managers and admins
- [x] Frontend analytics page with dashboard cards and report tables
- [x] Unit and E2E tests

### Analytics API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/analytics/dashboard` | `analytics:read_own` | Dashboard KPIs (tenant or own scope) |
| GET | `/api/v1/analytics/reports/spend` | `analytics:read_own` | Spend report with breakdowns |
| GET | `/api/v1/analytics/reports/spend/export` | `analytics:export` | Export spend report as CSV |

## Phase 7 — Notifications (Complete)

- [x] In-process event bus for domain events
- [x] Notifications on travel submit, approval steps, rejection, payment created/paid
- [x] Role-targeted delivery to approvers and requesters
- [x] In-app inbox with unread count, mark read, mark all read
- [x] Frontend notifications page
- [x] Unit and E2E tests

### Notifications API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/notifications` | `notifications:read` | List user's notifications |
| GET | `/api/v1/notifications/unread-count` | `notifications:read` | Get unread count |
| PATCH | `/api/v1/notifications/:id/read` | `notifications:write` | Mark notification as read |
| POST | `/api/v1/notifications/mark-all-read` | `notifications:write` | Mark all as read |

## Phase 6 — Finance (Complete)

- [x] Per diem payment records auto-created on travel request approval
- [x] Payment lifecycle: pending → paid / failed
- [x] Finance RBAC (employees see own, managers/admins see all, admin processes)
- [x] CSV export for finance reporting
- [x] Frontend finance page with mark-paid and export
- [x] Unit and E2E tests

### Finance API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/finance/payments` | `finance:read` | List payments (scoped by role) |
| GET | `/api/v1/finance/payments/export` | `finance:export` | Export payments as CSV |
| GET | `/api/v1/finance/payments/:id` | `finance:read` | Get payment by ID |
| POST | `/api/v1/finance/payments/:id/mark-paid` | `finance:process` | Mark pending payment as paid |
| POST | `/api/v1/finance/payments/:id/mark-failed` | `finance:process` | Mark pending payment as failed |

## Phase 5 — Approval Workflow (Complete)

- [x] Multi-step approval chain (employee: manager → admin; manager: admin only)
- [x] Approve/reject with optional comments and role-based step authorization
- [x] Audit trail logging for submit, approve, reject, and cancel actions
- [x] Pending approvals queue for managers and tenant admins
- [x] Frontend approvals page + audit trail on travel requests
- [x] Unit and E2E tests

### Approval API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/approvals/pending` | `approvals:read` | List requests awaiting actor's approval |
| POST | `/api/v1/approvals/travel-requests/:id/approve` | `approvals:approve` | Approve current workflow step |
| POST | `/api/v1/approvals/travel-requests/:id/reject` | `approvals:reject` | Reject at current step |
| GET | `/api/v1/approvals/travel-requests/:id/audit-trail` | `travel_requests:read` | Get audit trail (owner or read_all) |

## Phase 4 — Travel Request (Complete)

- [x] Travel request model with per diem calculation snapshot
- [x] Auto per diem calculation via policy engine on create/update
- [x] Status management: draft, pending_approval, approved, rejected, cancelled
- [x] RBAC with tenant-scoped access (employees own, managers/admins all)
- [x] Frontend travel requests page
- [x] Unit and E2E tests

### Travel Request API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/travel-requests` | `travel_requests:write` | Create draft with auto calculation |
| GET | `/api/v1/travel-requests` | `travel_requests:read` | List requests (scoped by role) |
| GET | `/api/v1/travel-requests/:id` | `travel_requests:read` | Get request by ID |
| PATCH | `/api/v1/travel-requests/:id` | `travel_requests:write` | Update draft (recalculates per diem) |
| POST | `/api/v1/travel-requests/:id/submit` | `travel_requests:submit` | Submit draft into approval workflow |
| POST | `/api/v1/travel-requests/:id/cancel` | `travel_requests:cancel` | Cancel draft or pending request |

## Phase 3 — Policy Engine (Complete)

- [x] Per diem policy model (country, role, rate, currency, priority)
- [x] Policy CRUD API with tenant isolation
- [x] Calculation engine with role-specific rule matching
- [x] RBAC permissions for policy management
- [x] Frontend policies page with calculator
- [x] Unit and E2E tests

### Policy API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/policies` | `policies:write` | Create policy |
| GET | `/api/v1/policies` | `policies:read` | List policies |
| GET | `/api/v1/policies/:id` | `policies:read` | Get policy |
| PATCH | `/api/v1/policies/:id` | `policies:write` | Update policy |
| DELETE | `/api/v1/policies/:id` | `policies:delete` | Delete policy |
| POST | `/api/v1/policies/calculate` | `policies:calculate` | Calculate per diem |

## Phase 2 — User Management + RBAC (Complete)

- [x] Permission-based RBAC (`RolesGuard`, `PermissionsGuard`)
- [x] Roles: `tenant_admin`, `manager`, `employee`
- [x] User CRUD API with tenant isolation
- [x] Invite users flow with `PENDING` status + accept invite
- [x] Last-admin protection and self-modification guards
- [x] Frontend user management + invite accept pages
- [x] Unit and E2E tests

### User Management API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/users` | `users:read` | List tenant users |
| GET | `/api/v1/users/:id` | `users:read` | Get user by ID |
| PATCH | `/api/v1/users/:id` | `users:write` | Update user |
| DELETE | `/api/v1/users/:id` | `users:delete` | Soft delete user |
| GET | `/api/v1/users/invites` | `users:invite` | List pending invites |
| POST | `/api/v1/users/invites` | `users:invite` | Create invite |
| DELETE | `/api/v1/users/invites/:id` | `users:invite` | Revoke invite |
| POST | `/api/v1/auth/accept-invite` | Public | Accept invite + set password |

## Phase 1 — Auth + Tenant (Complete)

- [x] MongoDB/Mongoose integration
- [x] Tenant and User models with `tenantId` isolation
- [x] JWT access + refresh tokens (bcrypt passwords)
- [x] Global `JwtAuthGuard` + `TenantGuard`
- [x] Auth endpoints: register-tenant, login, refresh, logout, me
- [x] Frontend login, register, and dashboard pages
- [x] Unit and E2E tests

### Auth API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register-tenant` | Public | Create tenant + admin user |
| POST | `/api/v1/auth/login` | Public | Login with tenant slug |
| POST | `/api/v1/auth/refresh` | Public | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Required | Revoke refresh tokens |
| GET | `/api/v1/auth/me` | Required | Current user profile |

## Development Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 0 | Foundation | ✅ Complete |
| 1 | Auth + Tenant | ✅ Complete |
| 2 | User Management + RBAC | ✅ Complete |
| 3 | Policy Engine | ✅ Complete |
| 4 | Travel Request | ✅ Complete |
| 5 | Approval Workflow | ✅ Complete |
| 6 | Finance | ✅ Complete |
| 7 | Notifications | ✅ Complete |
| 8 | Analytics | ✅ Complete |
| 9 | Security Hardening | ✅ Complete |
| 10 | Production | Pending |

## API Endpoints (Phase 0)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Full health check |
| GET | `/api/v1/health/live` | Liveness probe |
| GET | `/api/v1/health/ready` | Readiness probe |

## License

UNLICENSED — Private enterprise software
