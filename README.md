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
| 2 | User Management + RBAC | Pending |
| 3 | Policy Engine | Pending |
| 4 | Travel Request | Pending |
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
