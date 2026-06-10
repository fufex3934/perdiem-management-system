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

## Phase 4 — Travel Request (Complete)

- [x] Travel request model with per diem calculation snapshot
- [x] Auto per diem calculation via policy engine on create/update
- [x] Status management: draft, submitted, cancelled
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
| POST | `/api/v1/travel-requests/:id/submit` | `travel_requests:submit` | Submit draft for approval |
| POST | `/api/v1/travel-requests/:id/cancel` | `travel_requests:cancel` | Cancel draft or submitted request |

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
| 5 | Approval Workflow | Pending |
| 6 | Finance | Pending |
| 7 | Notifications | Pending |
| 8 | Analytics | Pending |
| 9 | Security Hardening | Pending |
| 10 | Production | Pending |

## API Endpoints (Phase 0)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Full health check |
| GET | `/api/v1/health/live` | Liveness probe |
| GET | `/api/v1/health/ready` | Readiness probe |

## License

UNLICENSED — Private enterprise software
