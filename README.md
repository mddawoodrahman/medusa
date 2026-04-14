<div align="center">

<img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js 15" />
<img src="https://img.shields.io/badge/React-19_RC-61DAFB?style=flat-square&logo=react" alt="React 19 RC" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript 5" />
<img src="https://img.shields.io/badge/Appwrite-Cloud-FD366E?style=flat-square&logo=appwrite" alt="Appwrite Cloud" />
<img src="https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat-square&logo=clerk" alt="Clerk Auth" />

<br /><br />

# Medusa

**A secure, multi-user cloud file workspace for teams that need private-by-default file access.**

Upload, organize, preview, and share files through an authorization-first workflow. Medusa avoids public storage URLs and serves every file through a protected server-side route.

[Live Demo](https://welovemedusa.vercel.app) | [Report Bug](../../issues) | [Request Feature](../../issues)

</div>

---

## Overview

Medusa is a production-grade file management platform built with **Next.js 15 App Router**, **Clerk**, **Appwrite**, and **Redis**. It supports direct browser uploads through short-lived Appwrite credentials, private file delivery through a Next.js proxy route, and share management backed by Appwrite database and storage permissions.

```text
Browser -> Clerk Auth -> Next.js Server Actions -> Redis (rate limit/cache/counters) -> Appwrite Repositories -> Appwrite Cloud
                  |
                  v
         Protected File Proxy -> Streamed Response (view/download/thumbnail)
```

## Features

| Feature | Description |
| --- | --- |
| Clerk authentication | Route and API protection through Clerk middleware |
| Direct browser uploads | Short-lived scoped Appwrite tokens avoid server-side upload proxying |
| Protected file delivery | Downloads, previews, and thumbnails stream through server-side authorization |
| File categorization | Files are grouped into documents, images, audio, video, and other |
| Search and pagination | Debounced search with paginated file listing pages |
| File sharing | Share by email with metadata updates and Appwrite Storage permission sync |
| Dashboard analytics | Storage usage summary cards and recent-file activity |
| Distributed rate limiting | Upload and download routes use Redis-backed fixed-window limits with user + IP scoping |
| Redis caching | Cache-first reads for file metadata, file listings, and dashboard totals with mutation invalidation |
| Usage counters | Per-user upload and download counters are tracked atomically for SaaS analytics and quotas |
| Structured logging | Server-side request logging includes request IDs for traceability |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 App Router |
| Runtime UI | React 19 RC |
| Language | TypeScript 5 |
| Auth | Clerk |
| Distributed system layer | Redis (ioredis) |
| Backend and storage | Appwrite Database, Storage, and Users |
| Styling | Tailwind CSS, shadcn/ui, Radix UI |
| Validation | Zod |
| Testing | Jest, ts-jest |
| Linting and formatting | ESLint, Prettier |
| CI/CD | GitHub Actions |

## Architecture

### Request Flow

```text
Browser
  -> Clerk Middleware
  -> Next.js App Router
  -> Server Actions / API Routes
  -> Redis (rate limits, cache, usage counters)
  -> Repository Layer
  -> Appwrite Cloud
```

### Upload Flow

```text
1. Client -> POST /api/upload/initiate with file metadata.
2. Server -> Validates auth, applies rate limiting, and issues a short-lived Appwrite token.
3. Browser -> Creates an Appwrite session and uploads directly to storage.
4. Server Action -> Persists the file metadata document after upload completion.
```

### Download and Thumbnail Flow

```text
1. Client -> GET /api/files/download/[id]?mode=view|download|thumbnail
2. Server -> Validates auth, applies rate limiting, and checks ownership/share access.
3. Server -> Streams the file with private cache headers.
```

## Repository Structure

```text
.
|-- app/
|   |-- (auth)/          # Clerk sign-in and sign-up routes
|   |-- (root)/          # Protected application routes
|   `-- api/             # Upload initiation and protected file proxy routes
|-- components/          # Shared UI components
|-- constants/           # Application constants
|-- hooks/               # React hooks
|-- lib/
|   |-- actions/         # Server Actions and domain workflows
|   |-- appwrite/        # Appwrite config and clients
|   |-- observability/   # Structured logging utilities
|   |-- repositories/    # Appwrite data access layer
|   `-- security/        # Rate limiting and security utilities
|-- scripts/             # Appwrite bootstrap script
|-- test/                # Unit, integration, and critical-journey tests
`-- types/               # Shared TypeScript types
```

## Data Model

### `users`

| Field | Type | Description |
| --- | --- | --- |
| `fullName` | string | Display name |
| `email` | email | Share lookup and identity |
| `avatar` | url | Profile image |
| `clerkUserId` | string | Primary application identity key |

### `files`

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | File name |
| `type` | string | `document`, `image`, `video`, `audio`, or `other` |
| `extension` | string | Lowercase file extension |
| `url` | url | Protected application URL |
| `size` | integer | File size in bytes |
| `clerkUserId` | string | Owner ID |
| `ownerName` | string | Owner display-name snapshot |
| `bucketField` | string | Appwrite Storage file ID |
| `users` | string[] | Legacy share fallback |

### `file_shares`

| Field | Type | Description |
| --- | --- | --- |
| `fileId` | string | File document ID |
| `principal` | string | Shared `clerkUserId` or email |
| `role` | string | Share role, currently `viewer` |
| `status` | string | `active` or `inactive` |
| `ownerId` | string | Owner `clerkUserId` |
| `type` | string | Share strategy metadata |

## Security Model

- Clerk middleware protects application routes and API endpoints.
- Upload initiation requires an authenticated Clerk session and a valid application user profile.
- File delivery checks ownership or active share access before streaming content.
- Appwrite Storage permissions are synchronized when files are shared or unshared.
- Public storage read permissions are not granted; file access flows through the protected proxy.
- Upload and download routes apply Redis-backed distributed rate limiting (with bounded local fallback if Redis is unavailable).

## API Reference

### `POST /api/upload/initiate`

Returns short-lived Appwrite credentials for direct browser uploads.

| Status | Condition |
| --- | --- |
| `200` | Credentials issued |
| `400` | Invalid payload |
| `401` | Unauthenticated or missing application user profile |
| `413` | File exceeds configured upload limit |
| `429` | Rate limit exceeded |

### `GET /api/files/download/[id]`

Streams a file after server-side authorization.

| Query parameter | Values | Description |
| --- | --- | --- |
| `mode` | `view`, `download`, `thumbnail` | Delivery mode |
| `w` | integer | Thumbnail width, sanitized on the server |
| `h` | integer | Thumbnail height, sanitized on the server |

| Status | Condition |
| --- | --- |
| `200` | File streamed successfully |
| `400` | Thumbnail requested for a non-image file |
| `401` | Unauthenticated or missing application user profile |
| `403` | Access denied |
| `404` | Storage object ID missing |
| `429` | Rate limit exceeded |

## Local Development

### Prerequisites

- Bun 1.1+ or Node.js 20+ with npm
- Clerk application
- Appwrite project and database
- Appwrite API key with users, database, and storage scopes
- Redis instance (local or managed, such as Azure Cache for Redis)

### 1. Install Dependencies

```bash
bun install
```

or:

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Then fill in the values listed in [Environment Variables](#environment-variables).

### 3. Bootstrap Appwrite Resources

```bash
node scripts/setup-appwrite.js
```

The setup script creates or reuses the `users`, `files`, and `file_shares` collections, creates the storage bucket, and prints generated IDs to copy into `.env.local`.

### 4. Start the Development Server

```bash
bun run dev
```

or:

```bash
npm run dev
```

### 5. Optional: Run App + Redis with Docker Compose

```bash
docker compose up --build
```

This uses the app image and a Redis service defined in `docker-compose.yml`.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Yes | Appwrite endpoint URL |
| `NEXT_PUBLIC_APPWRITE_PROJECT` | Yes | Appwrite project ID |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Optional | Backward-compatible Appwrite project ID alias |
| `NEXT_PUBLIC_APPWRITE_DATABASE` | Yes | Appwrite database ID |
| `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION` | Yes | `users` collection ID |
| `NEXT_PUBLIC_APPWRITE_FILES_COLLECTION` | Yes | `files` collection ID |
| `NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION` | Recommended | `file_shares` collection ID |
| `NEXT_PUBLIC_APPWRITE_BUCKET` | Yes | Appwrite storage bucket ID |
| `NEXT_PUBLIC_APPWRITE_MAX_UPLOAD_SIZE` | Optional | Max upload bytes, default `52428800` |
| `NEXT_APPWRITE_KEY` | Yes | Appwrite server API key |
| `REDIS_URL` | Recommended | Redis connection string (for example `redis://redis:6379` locally or `rediss://...` for managed TLS) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | Sign-in route |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | Sign-up route |

## Scripts and Quality Gates

| Script | Purpose |
| --- | --- |
| `dev` | Start the Next.js development server with Turbopack |
| `typecheck` | Run the TypeScript compiler without emitting files |
| `lint` | Run ESLint |
| `test:unit` | Run unit-focused Jest tests |
| `test:integration` | Run integration tests |
| `test:e2e` | Run critical-journey Jest tests |
| `test` | Run unit and integration tests |
| `test:watch` | Run Jest in watch mode |
| `build` | Create a production build |
| `start` | Start the production server |
| `ci:verify` | Run clean install, typecheck, lint, tests, and build |
| `test:ci` | Run typecheck, lint, tests, and build |

## CI/CD

The GitHub Actions workflow runs on:

- Pushes to `main` and `dev`
- Pull requests targeting `main`

Pipeline:

```text
Install -> Typecheck -> Lint -> Test -> Build
```

## Known Constraints

- Dashboard storage usage uses a fixed 2 GB cap in application logic.
- If `REDIS_URL` is not configured or Redis is unavailable, rate limiting falls back to bounded process memory.
- `test:e2e` currently runs Jest route tests rather than browser-driven automation.
- `scripts/setup-appwrite.js` is a bootstrap tool, not a versioned migration system.
- React is pinned to RC builds while the project uses React 18 type packages.

## Roadmap

### Priority 1: Reliability and Scale

- Precompute per-user storage aggregates to reduce dashboard scan cost.
- Add plan-aware quota enforcement using Redis usage counters.
- Introduce explicit Server Action result contracts for deterministic UI state.

### Priority 2: Quality and Correctness

- Add browser-driven E2E tests for upload, share, preview, and download flows.
- Replace the bootstrap-only setup script with a versioned migration workflow.
- Optimize shared-file lookup paths for higher collaboration volume.

### Priority 3: Sustainability

- Stabilize dependency strategy around non-RC React releases.
- Add distributed tracing and latency dashboards.

## Troubleshooting

### Sign-in or Sign-up Does Not Work

- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
- Confirm `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL` match the actual route paths.
- Ensure auth routes are public in `middleware.ts`.

### Upload Initiation Returns `401`

- Confirm an active Clerk session exists in the browser.
- Verify the `users` collection ID is set correctly.
- Confirm the Appwrite API key has users, database, and storage scopes.
- Check that user profile provisioning completed successfully.

### Download Returns `403`

- Verify the requester owns the file or has an active share record.
- Confirm `NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION` is configured.
- Verify storage permissions were updated correctly.

### Setup Script Fails

- Confirm `.env.local` exists and all required values are set.
- Ensure the target Appwrite database exists before running the script.
- Verify the Appwrite API key includes users, database, and storage scopes.

---

<div align="center">

Built by [Md Dawood Rahman](https://github.com/mddawoodrahman) | [Live Demo](https://welovemedusa.vercel.app) | IIT Patna MCA '27

</div>
