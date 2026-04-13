# Medusa

Medusa is a secure, multi-user file workspace built with Next.js 15, Clerk, and Appwrite. It supports authenticated uploads with short-lived credentials, protected file delivery through server-side authorization, library browsing by type, and file sharing.

Live URL: https://welovemedusa.vercel.app/

## Table of Contents

- Product Summary
- Architecture Overview
- Complete Application Analysis
- Repository Structure
- Data Model
- Security Model
- API Reference
- Local Development
- Environment Variables
- Scripts and Quality Gates
- CI and Delivery
- Known Constraints
- Improvement Roadmap
- Troubleshooting

## Product Summary

### Core Capabilities

- Clerk-authenticated app routes and API access.
- Direct browser-to-Appwrite uploads via short-lived scoped token sessions.
- Secure file access proxy route for view, download, and thumbnails.
- File categorization into documents, images, audio, video, and other.
- Search, sort, and cursor pagination for file listing pages.
- File sharing by email with metadata plus Appwrite Storage permission updates.
- Dashboard summary cards and recent-file activity.
- Structured server logging with request IDs.

### Tech Stack

| Layer | Implementation |
| --- | --- |
| Framework | Next.js 15 App Router |
| Runtime UI | React 19 RC |
| Auth | Clerk |
| Data + Storage | Appwrite (database + storage + users) |
| UI System | Tailwind CSS, shadcn/ui, Radix UI |
| Validation | Zod |
| Testing | Jest + ts-jest |
| Lint/Format | ESLint + Prettier |
| CI | GitHub Actions |

## Architecture Overview

### High-Level Flow

1. Middleware protects all non-auth routes.
2. Authenticated requests resolve the current Clerk user and ensure a matching Appwrite user profile exists.
3. Server Actions handle file domain logic and call repositories.
4. Repositories interact with Appwrite via an admin client.
5. All file URLs resolve to protected app routes instead of public storage URLs.

### Upload Flow

1. Client calls POST /api/upload/initiate with file metadata.
2. API route verifies auth, applies rate limit, validates payload, and issues short-lived Appwrite token.
3. Browser creates an Appwrite session using token and uploads directly to storage.
4. Server Action persists metadata document after upload completes.

### Download and Thumbnail Flow

1. Client requests GET /api/files/download/[id]?mode=view|download|thumbnail.
2. Route validates auth, applies rate limit, and checks ownership/share access.
3. Route streams file view/download/preview with private cache headers.

## Complete Application Analysis

Analysis date: April 13, 2026

### 1) Architecture and Modularity

Current state:
- Good separation exists between actions and repositories.
- Route-level concerns are mostly clean and security-aware.

Strengths:
- Clear layering: UI -> Actions -> Repositories -> Appwrite.
- Reusable security checks for owner validation and file access.

Gaps:
- Some business rules are split across route handlers, actions, and repositories, which increases coupling.
- Multiple places resolve auth + user hydration independently.

### 2) Code Quality and Maintainability

Current state:
- TypeScript is used consistently.
- Error logging is structured and centralized.

Strengths:
- Validation with Zod in upload initiation.
- Reasonably consistent naming and conventions.

Gaps:
- Some UI flows rely on truthy return values from server actions instead of explicit result contracts.
- Serialization helper pattern uses JSON parse/stringify frequently, which can hide type boundaries.

### 3) Performance and Scalability

Current state:
- Core pages are force-dynamic.
- Dashboard total usage scans all user files at request time.

Strengths:
- Pagination exists for listing pages.
- Recent uploads fetched in parallel with storage summary.

Gaps:
- Shared-access query path can become expensive at higher collaboration volume.
- Dynamic rendering everywhere limits caching leverage.

### 4) Reliability and Resilience

Current state:
- Good local rollback attempts on multi-step rename/share operations.
- Rate limiting is implemented for upload and download routes.

Strengths:
- Defensive checks for unauthorized, forbidden, invalid payload, and oversize upload cases.
- Thumbnail input sanitization prevents unreasonable dimensions.

Gaps:
- Rate limiting store is in-memory and not distributed.
- No explicit idempotency keys for mutation workflows.

### 5) Security and Privacy

Current state:
- Private-by-default file access model is correctly enforced.
- No public read permission grants.

Strengths:
- Clerk route protection + server-side authorization checks before file delivery.
- Download filename sanitization and controlled content disposition.

Gaps:
- IP extraction uses forwarding headers directly; trust model depends on deployment proxy setup.
- Appwrite admin key is central to all repository calls, so key governance is critical.

### 6) Data Layer

Current state:
- Users, files, and file_shares collections are used with basic indexes.
- Legacy fallback to users[] email array exists when file_shares is missing.

Strengths:
- Data model supports owner + shared principals.
- Share updates synchronize both metadata and storage permissions.

Gaps:
- Share lookup and reconciliation can become heavy at scale.
- Setup script is functional but migration handling is not versioned.

### 7) Testing Strategy

Current state:
- Middleware and integration-style route/action tests exist.
- Coverage focuses on auth, upload, permission, and download behavior.

Strengths:
- Critical authorization logic is tested.
- CI runs typecheck, lint, tests, and build.

Gaps:
- Most integration tests use mocked dependencies.
- test:e2e currently uses Jest route tests, not browser-driven E2E.

### 8) DevOps and Delivery

Current state:
- Single GitHub Actions workflow for main/dev pushes and PRs.

Strengths:
- CI gate includes typecheck + lint + test + build.
- Uses maintained versions of checkout and setup-node actions.

Gaps:
- No dedicated deployment-stage smoke tests.
- No explicit observability pipeline beyond console JSON logs.

### 9) Dependencies and Upgrades

Current state:
- Next.js and linting stack are updated and aligned.
- React is pinned to RC builds.

Strengths:
- Security override present for brace-expansion transitive dependency.

Gaps:
- React RC runtime with React 18 type packages introduces long-term upgrade risk.

### 10) Product-Level Technical Improvements

High-impact opportunities:
- Add precomputed per-user storage aggregates to reduce dashboard scan cost.
- Replace in-memory rate limiter with distributed backing for horizontal scale.
- Introduce browser E2E for upload/share/download journeys.
- Introduce explicit action result contracts for cleaner UI state handling.

## Repository Structure

```text
app/
  (auth)/
  (root)/
  api/
components/
constants/
hooks/
lib/
  actions/
  appwrite/
  observability/
  repositories/
  security/
scripts/
test/
types/
```

## Data Model

### users collection

| Field | Type | Purpose |
| --- | --- | --- |
| fullName | string | Display name |
| email | email | Share lookup and identity |
| avatar | url | Profile image |
| clerkUserId | string | Primary app identity key |

### files collection

| Field | Type | Purpose |
| --- | --- | --- |
| name | string | File name |
| type | string | document, image, video, audio, other |
| extension | string | Lowercase extension |
| url | url | Protected app URL |
| size | integer | File size in bytes |
| clerkUserId | string | Owner ID |
| ownerName | string | Owner snapshot |
| bucketField | string | Appwrite Storage file ID |
| users | string[] | Legacy share fallback |

### file_shares collection

| Field | Type | Purpose |
| --- | --- | --- |
| fileId | string | File document ID |
| principal | string | Shared clerkUserId or email |
| role | string | Share role (viewer) |
| status | string | active/inactive state |
| ownerId | string | Owner clerkUserId |
| type | string | Share strategy metadata |

## Security Model

- Protected routes enforced by Clerk middleware.
- Upload initiation requires authenticated user and validated payload.
- File delivery checks ownership/share authorization before streaming content.
- Appwrite Storage permissions are set per owner and shared users.
- No public storage permissions are granted by default.

## API Reference

### POST /api/upload/initiate

Purpose:
- Return short-lived Appwrite credentials and upload metadata.

Behavior:
- 401 if unauthenticated.
- 400 for invalid payload.
- 413 for oversized uploads.
- 429 when rate limit exceeded.

### GET /api/files/download/[id]

Query:
- mode=view|download|thumbnail
- w and h for thumbnail size (sanitized to safe bounds)

Behavior:
- 401 if unauthenticated.
- 403 if access denied.
- 400 for invalid thumbnail mode on non-image file.
- Streams file with private cache strategy.

## Local Development

### Prerequisites

- Bun 1.1+ (recommended) or npm
- Node.js 20+
- Clerk app
- Appwrite project and database
- Appwrite API key with users, database, and storage permissions

### 1) Install dependencies

With Bun:

```bash
bun install
```

With npm:

```bash
npm install
```

### 2) Configure environment

Copy .env.example to .env.local and set values listed in the Environment Variables section.

### 3) Bootstrap Appwrite resources

```bash
node scripts/setup-appwrite.js
```

This script creates or reuses collections and bucket resources, then prints generated IDs.

### 4) Run development server

With Bun:

```bash
bun run dev
```

With npm:

```bash
npm run dev
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| NEXT_PUBLIC_APPWRITE_ENDPOINT | Yes | Appwrite endpoint URL |
| NEXT_PUBLIC_APPWRITE_PROJECT or NEXT_PUBLIC_APPWRITE_PROJECT_ID | Yes | Appwrite project ID |
| NEXT_PUBLIC_APPWRITE_DATABASE | Yes | Appwrite database ID |
| NEXT_PUBLIC_APPWRITE_USERS_COLLECTION | Yes | users collection ID |
| NEXT_PUBLIC_APPWRITE_FILES_COLLECTION | Yes | files collection ID |
| NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION | Recommended | file_shares collection ID |
| NEXT_PUBLIC_APPWRITE_BUCKET | Yes | Appwrite bucket ID |
| NEXT_PUBLIC_APPWRITE_MAX_UPLOAD_SIZE | Optional | Max upload bytes (default 52428800) |
| NEXT_APPWRITE_KEY | Yes | Appwrite server API key |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Yes | Clerk publishable key |
| CLERK_SECRET_KEY | Yes | Clerk secret key |
| NEXT_PUBLIC_CLERK_SIGN_IN_URL | Yes | Sign-in route |
| NEXT_PUBLIC_CLERK_SIGN_UP_URL | Yes | Sign-up route |

## Scripts and Quality Gates

| Script | Purpose |
| --- | --- |
| dev | Start Next.js with Turbopack |
| typecheck | TypeScript compile check |
| lint | ESLint checks |
| test:unit | Unit-focused Jest run |
| test:integration | Integration test folder run |
| test:e2e | Jest critical-journey tests |
| test | Unit + integration |
| build | Production build |
| start | Production server |
| ci:verify | Fresh install + full verification |
| test:ci | Typecheck + lint + test + build |

## CI and Delivery

GitHub Actions workflow currently runs on:
- push to main and dev
- pull request to main

CI stages:
1. Install dependencies
2. Type check
3. Lint
4. Test
5. Build

## Known Constraints

- Dashboard storage chart uses a fixed 2 GB cap in application logic.
- Rate limiter currently uses process memory (single-instance oriented).
- Search suggestions are server-action driven from client debounce.
- Setup script is not a versioned migration system.
- test:e2e is not browser automation yet.

## Improvement Roadmap

Priority 1:
- Introduce precomputed user storage aggregates.
- Move rate limiting to distributed storage.
- Add explicit action result contracts for UI reliability.

Priority 2:
- Add browser-driven E2E test suite.
- Replace setup script approach with versioned migrations.
- Optimize share-lookup data access path for higher scale.

Priority 3:
- Stabilize dependency strategy around non-RC React releases.
- Expand observability with tracing and latency dashboards.

## Troubleshooting

### Sign-in/sign-up issues

- Validate Clerk keys and auth route environment variables.
- Confirm auth routes remain public in middleware.

### Upload initiation unauthorized

- Verify Clerk session exists.
- Verify users collection and Appwrite key permissions.
- Verify user profile provisioning is successful.

### Download returns forbidden

- Verify ownership or active share exists.
- Verify file_shares collection ID is configured.
- Verify storage permissions were updated correctly.

### Setup script failures

- Ensure .env.local exists and values are valid.
- Ensure target Appwrite database already exists.
- Ensure API key includes required users/database/storage scopes.
