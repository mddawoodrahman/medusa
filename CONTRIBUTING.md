# Contributing to Medusa

Thank you for contributing to Medusa.

This guide documents how to contribute safely and effectively to this repository.

## 1) Project Overview

Medusa is an authorization-first cloud file workspace for teams.

Its core purpose is secure file upload, organization, preview, download, and sharing with strict server-side authorization. File access is intentionally mediated through protected API routes instead of exposing direct public storage URLs.

Main capabilities:

- Auth-protected application and API routes via Clerk.
- Secure upload initiation with scoped, short-lived Appwrite credentials.
- Server-side file proxy for view, download, and thumbnails.
- Redis-backed caching, usage counters, and rate limiting.
- Sharing model with ownership and share validation before access.

## 2) Technology Stack

Primary stack:

- Language: TypeScript
- Framework: Next.js 15 (App Router)
- UI: React 19 RC, Tailwind CSS, Radix UI, shadcn/ui
- Auth: Clerk
- Backend services: Appwrite (Database + Storage)
- Cache and rate limiting: Redis via ioredis
- Validation: Zod
- Testing: Jest + ts-jest
- Linting: ESLint (flat config + TypeScript + Tailwind plugin)
- Formatting: Prettier (config integration via eslint-config-prettier)
- Containerization: Docker and Docker Compose
- Orchestration/deploy option: Kubernetes (Kustomize overlays for EKS/GKE/AKS)
- CI/CD: GitHub Actions

## 3) Project Structure

High-level layout and purpose:

- `app/`: Next.js App Router pages/layouts and API route handlers
- `app/api/`: API endpoints (`upload/initiate`, `files/download/[id]`, `health/startup`)
- `components/`: Reusable UI components and primitives (`components/ui/`)
- `constants/`: Shared constants (navigation, sorting, etc.)
- `hooks/`: Reusable React hooks
- `lib/`: Core domain logic and integrations
- `lib/actions/`: Server Actions and business workflows
- `lib/appwrite/`: Appwrite configuration and client setup
- `lib/repositories/`: Data-access layer for users/files/shares
- `lib/security/`: Security utilities (rate limiting)
- `lib/observability/`: Structured logging and request ID support
- `scripts/`: Utility scripts (Appwrite bootstrap and K8s ingress helper)
- `test/`: Jest tests (`integration`, `e2e`, plus middleware tests)
- `k8s/`: Kubernetes manifests, base + cloud overlays, and ops guide
- `public/`: Static assets
- `types/`: Shared TypeScript type declarations

## 4) Development Setup

### Prerequisites

- Bun 1.1+ (preferred locally) or Node.js 20+
- Appwrite project and API key (users, databases, storage scopes)
- Clerk application keys
- Redis instance (local or managed)

### Setup Steps

1. Clone the repository.

```bash
git clone https://github.com/mddawoodrahman/medusa.git
cd medusa
```

2. Install dependencies.

```bash
# Preferred local workflow
bun install

# Alternative
npm install
```

3. Create local environment config.

```bash
cp .env.example .env.local
```

4. Fill all required environment variables in `.env.local`.

5. Bootstrap Appwrite collections and bucket.

```bash
node scripts/setup-appwrite.js
```

6. Start local development server.

```bash
# Preferred local workflow
bun run dev

# Alternative
npm run dev
```

### Optional Docker-based local run

```bash
docker compose up --build
```

## 5) Testing

Testing is implemented with Jest (`jest.config.cjs`) and `ts-jest` using a Node test environment.

Test areas include:

- Middleware behavior
- Integration tests for API routes and service behavior
- Critical user journey coverage in `test/e2e` (Jest-driven route-level scenarios)

Useful commands:

```bash
# Unit + integration
npm run test

# Specific suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode
npm run test:watch
```

Before opening a PR, run the same quality gates expected by CI:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Or use:

```bash
npm run test:ci
```

## 6) Code Style

Contributors should follow existing TypeScript and Next.js patterns:

- Use TypeScript with explicit, readable types.
- Keep business logic in `lib/` and avoid pushing logic into UI components when possible.
- Preserve repository pattern boundaries (`lib/repositories/`).
- Validate incoming API payloads with Zod when relevant.
- Prefer small, focused functions and consistent naming.

Linting/style enforcement:

- ESLint flat config in `eslint.config.js`
- `@typescript-eslint` rules
- `next/core-web-vitals`
- `plugin:tailwindcss/recommended`
- `prettier` compatibility

Run style checks with:

```bash
npm run lint
```

## 7) Build and Deployment

Build and runtime scripts:

```bash
npm run build
npm run start
```

CI/CD:

- `.github/workflows/ci-cd.yml` runs on push to `main`/`dev` and PRs to `main`.
- Quality gate sequence: typecheck -> lint -> test -> build.

Container/Kubernetes:

- `Dockerfile` provides a multi-stage production build.
- `docker-compose.yml` provides local app + Redis setup.
- `.github/workflows/build-push-deploy-k8s.yml` supports image build/push and optional K8s deploy.
- `k8s/` includes base manifests and overlays for EKS/GKE/AKS.

## 8) Existing Documentation

Please read these first before large changes:

- `README.md`: architecture, setup, env vars, scripts, and deployment overview
- `k8s/README.md`: Kubernetes deployment and operations guide
- `LICENSE`: Apache 2.0 terms

When changing behavior, keep docs synchronized with code changes.

## 9) Community Guidelines

Current collaboration model:

- Use GitHub Issues for bug reports and feature proposals.
- Use Pull Requests for implementation changes.
- For larger changes, open an issue first to align on approach.
- Keep PR descriptions clear: problem, scope, testing, and risks.
- Be respectful, constructive, and specific in review discussions.

There is currently no dedicated `CODE_OF_CONDUCT.md` in this repository. Until one is added, use professional, inclusive communication standards in all project interactions.

## 10) License

By contributing, you agree that your contributions are provided under the same project license:

- Apache License 2.0 (`LICENSE`)

## Branching and Pull Request Workflow

1. Create a feature/fix branch from the latest target branch.

```bash
git checkout -b feat/short-description
```

2. Make focused commits with meaningful messages.

3. Run local checks.

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

4. Open a PR targeting the `dev` branch unless maintainers request otherwise.

5. In your PR description include:

- What changed and why
- Any environment or migration impacts
- Test evidence (commands and outcomes)

## Contributor Checklist

Before requesting review:

- [ ] Changes are scoped and documented.
- [ ] Relevant tests were added or updated.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `README.md` and/or `k8s/README.md` were updated if behavior changed.

Thank you for helping improve Medusa.