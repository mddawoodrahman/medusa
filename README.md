<div align="center">

# Medusa

**Secure, private-by-default file management for modern teams.**

A full-stack Next.js 15 application for authenticated uploads, protected streaming downloads, and controlled file sharing powered by Clerk, Appwrite, and Redis.

[![CI](https://img.shields.io/github/actions/workflow/status/mddawoodrahman/medusa/ci-cd.yml?branch=main&label=CI)](https://github.com/mddawoodrahman/medusa/actions/workflows/ci-cd.yml)
[![License: Apache-2.0](https://img.shields.io/github/license/mddawoodrahman/medusa)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Clerk](https://img.shields.io/badge/Clerk-Authentication-6C47FF)](https://clerk.com/)
[![Appwrite](https://img.shields.io/badge/Appwrite-Cloud-FD366E?logo=appwrite&logoColor=white)](https://appwrite.io/)
[![Redis](https://img.shields.io/badge/Redis-Distributed%20Layer-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Production%20Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[Live Demo](https://welovemedusa.vercel.app) • [Open Issues](../../issues) • [Contribute](#contributing)

If this project helps you, please consider starring the repository and sharing it.

</div>

---

## Why Medusa?

Most file apps either expose public URLs too early or force every upload/download through heavyweight backend proxying. That creates security risk, cost, or both.

Medusa solves this by combining:

- Direct browser uploads with short-lived scoped Appwrite tokens.
- Server-authorized file delivery through protected Next.js routes.
- Fine-grained sharing and permission synchronization.
- Redis-backed distributed rate limiting, caching, and usage counters for horizontal scale.

This makes Medusa suitable for teams building secure internal tools, client portals, and SaaS products that require private file access by default.

## Key Features

- Private-by-default storage model: no public file URLs required for normal access.
- Authenticated direct uploads: browser uploads directly to Appwrite after secure token issuance.
- Protected streaming downloads: all reads pass through ownership/share authorization.
- Rich file workflows: list, search, filter by type, rename, delete, share/unshare.
- Distributed abuse protection: Redis-backed fixed-window limits using user and user+IP keys.
- Smart caching layer: cache-first metadata, user file lists, and dashboard usage summaries.
- SaaS analytics foundation: atomic Redis counters for uploads and downloads per user.
- Production deployment support: standalone Next.js Docker image and optional Compose stack.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend + SSR | Next.js 15 App Router, React 19 RC |
| Language | TypeScript 5 |
| AuthN/AuthZ | Clerk |
| Data + Object Storage | Appwrite Database and Storage |
| Distributed Systems | Redis via ioredis |
| UI | Tailwind CSS, shadcn/ui, Radix UI |
| Validation | Zod |
| Observability | Structured server logging with request IDs |
| Testing | Jest + ts-jest (unit, integration, critical journeys) |
| CI | GitHub Actions |
| Containerization | Docker (multi-stage), Docker Compose |

## Architecture Overview

### System Snapshot

```text
Browser Client
  -> Clerk Middleware (auth enforcement)
  -> Next.js App Router (Server Actions + API routes)
  -> Redis (rate limiting, caching, usage counters)
  -> Appwrite (users, database, storage)
```

### Upload Flow

```text
1) Client -> POST /api/upload/initiate
2) Server -> validates auth, payload, and rate limits
3) Server -> creates short-lived Appwrite token scoped to user identity
4) Browser -> uploads directly to Appwrite Storage
5) Server Action -> persists file metadata and invalidates related cache keys
```

### Download Flow

```text
1) Client -> GET /api/files/download/[id]?mode=view|download|thumbnail
2) Server -> validates auth + access rights (owner or active share)
3) Server -> applies Redis rate limit and records usage counter
4) Server -> streams view/download/thumbnail from Appwrite with private cache headers
```

### Redis Usage

- Rate limiting keys:
  - `upload:{userId}`
  - `download:{userId}`
  - `user:{userId}:ip:{ip}:upload`
  - `user:{userId}:ip:{ip}:download`
- Cache keys:
  - `file:{fileId}`
  - `user:{userId}:files:{fingerprint}`
  - `dashboard:{userId}`
- Usage counters:
  - `user:{userId}:uploads_count`
  - `user:{userId}:downloads_count`

## Screenshots

| Dashboard | File Library |
| --- | --- |
| ![Dashboard](public/assets/images/files.png) | ![Library](public/assets/images/files-2.png) |

| Upload Experience | Profile/Workspace |
| --- | --- |
| ![Upload](public/assets/images/photo.png) | ![Avatar](public/assets/images/avatar.png) |

## Installation and Local Setup

### Prerequisites

- Bun 1.1+ or Node.js 20+
- Clerk application (publishable + secret keys)
- Appwrite project (database + bucket + API key)
- Redis instance (local Docker Redis or managed Redis)

### 1. Clone the repository

```bash
git clone https://github.com/mddawoodrahman/medusa.git
cd medusa
```

### 2. Install dependencies

Preferred:

```bash
bun install
```

Alternative:

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Set all required variables from the table below.

### 4. Bootstrap Appwrite collections and bucket

```bash
node scripts/setup-appwrite.js
```

This script creates or reuses:

- `users` collection
- `files` collection
- `file_shares` collection
- storage bucket

### 5. Start the app

Preferred:

```bash
bun run dev
```

Alternative:

```bash
npm run dev
```

Open `http://localhost:3000`.

### Optional: run app + Redis via Docker Compose

```bash
docker compose up --build
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Yes | Appwrite API endpoint (for example `https://cloud.appwrite.io/v1`) |
| `NEXT_PUBLIC_APPWRITE_PROJECT` | Yes* | Appwrite project ID |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Optional | Backward-compatible alias for project ID |
| `NEXT_PUBLIC_APPWRITE_DATABASE` | Yes | Appwrite database ID |
| `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION` | Yes | `users` collection ID |
| `NEXT_PUBLIC_APPWRITE_FILES_COLLECTION` | Yes | `files` collection ID |
| `NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION` | Recommended | `file_shares` collection ID |
| `NEXT_PUBLIC_APPWRITE_BUCKET` | Yes | Appwrite bucket ID |
| `NEXT_PUBLIC_APPWRITE_MAX_UPLOAD_SIZE` | Optional | Max upload bytes (default `52428800`) |
| `NEXT_APPWRITE_KEY` | Yes | Appwrite server API key |
| `REDIS_URL` | Recommended | Redis URL (`redis://...` locally, `rediss://...` for managed TLS) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | Sign-in path (default `/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | Sign-up path (default `/sign-up`) |

`*` Either `NEXT_PUBLIC_APPWRITE_PROJECT` or `NEXT_PUBLIC_APPWRITE_PROJECT_ID` must be defined.

## API Reference

### `POST /api/upload/initiate`

Issues short-lived upload credentials for direct browser upload.

Request body:

```json
{
  "fileId": "optional-string",
  "fileName": "invoice.pdf",
  "size": 102400
}
```

Response highlights:

- upload endpoint/project/bucket/file context
- token secret + expiry for temporary Appwrite session
- rate-limit metadata (`remaining`, `resetMs`)

Status codes:

- `200` Success
- `400` Invalid payload
- `401` Unauthorized
- `413` File too large
- `429` Too many requests
- `500` Internal error

### `GET /api/files/download/[id]`

Streams secure file content after authorization.

Query params:

- `mode`: `view` | `download` | `thumbnail`
- `w`: thumbnail width (sanitized)
- `h`: thumbnail height (sanitized)

Status codes:

- `200` Success
- `400` Thumbnail requested for non-image file
- `401` Unauthorized
- `403` Forbidden
- `404` Missing storage object
- `429` Too many requests
- `500` Internal error

## Security Considerations

- Route and API protection is enforced via Clerk middleware.
- File access is authorized on the server for every download/preview request.
- Storage objects remain private; access is mediated by protected routes.
- Upload credentials are short-lived and scoped per authenticated user.
- Rate limiting uses distributed Redis keys with user+IP dimensioning.
- Download responses use private cache headers and sanitized content disposition.
- Sharing updates synchronize metadata and storage permissions.

## Performance Optimizations

- Cache-first reads for expensive and frequent operations:
  - file metadata (`300s` TTL)
  - user file listings (`45s` TTL)
  - dashboard aggregate usage (`60s` TTL)
- Batched Redis operations via pipelines for reduced RTT.
- Atomic Redis counters for high-throughput usage tracking.
- Cache invalidation on upload, delete, rename, and share/unshare operations.
- Next.js App Router server rendering with selective revalidation (`revalidateTag`, `revalidatePath`).

## Deployment Guide

### Option A: Vercel + Managed Services (recommended)

1. Deploy the Next.js app to Vercel.
2. Configure environment variables in Vercel project settings.
3. Use managed Appwrite + Clerk + managed Redis.
4. Set `REDIS_URL` to TLS-enabled managed endpoint (`rediss://...`) when required.

### Option B: Linux Container Platforms (App Service / Container Apps)

Use the included production Dockerfile:

```bash
docker build -t medusa:prod .
docker run --rm -p 3000:3000 --env-file .env.local medusa:prod
```

For local distributed testing with Redis:

```bash
docker compose up --build
```

## Project Structure

```text
.
|-- app/
|   |-- (auth)/                    # Clerk auth routes
|   |-- (root)/                    # Protected app pages
|   `-- api/
|       |-- upload/initiate/       # Direct-upload token issuing route
|       `-- files/download/[id]/   # Secure stream/download/thumbnail route
|-- components/                    # UI primitives and feature components
|-- lib/
|   |-- actions/                   # Server Actions
|   |-- appwrite/                  # Appwrite client/config helpers
|   |-- cache.ts                   # Redis caching + counters
|   |-- redis.ts                   # Redis singleton client
|   |-- repositories/              # Data access layer
|   `-- security/rate-limit.ts     # Distributed fixed-window limiter
|-- scripts/setup-appwrite.js      # Appwrite bootstrap script
|-- test/                          # Unit, integration, e2e-style tests
|-- Dockerfile                     # Production multi-stage image
`-- docker-compose.yml             # Local app + Redis stack
```

## Developer Workflow

Useful scripts:

- `npm run dev` - start local development server
- `npm run typecheck` - strict TypeScript checks
- `npm run lint` - ESLint validation
- `npm run test` - unit + integration tests
- `npm run build` - production build
- `npm run ci:verify` - CI-equivalent local verification

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch (`feat/your-change`).
3. Install dependencies and configure `.env.local`.
4. Run quality checks:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test`
   - `npm run build`
5. Open a pull request with clear context and screenshots/logs when relevant.

Please prefer focused PRs, production-safe defaults, and tests for behavior changes.

## License

Licensed under the Apache License 2.0.

See [LICENSE](LICENSE) for details.

## Roadmap

### Near-term

- Enforce plan-aware quotas using Redis usage counters.
- Add more analytics endpoints for usage and throughput insights.
- Expand integration tests around sharing and cache invalidation paths.

### Mid-term

- Browser-driven end-to-end test coverage for critical user journeys.
- Optional OpenTelemetry tracing across API and Server Actions.
- Background jobs for asynchronous file workflows and notifications.

### Long-term

- Multi-tenant administration and billing-ready governance controls.
- Enterprise-grade audit trail and policy enforcement controls.
- Richer collaboration roles beyond viewer-level sharing.

## Troubleshooting

### `401 Unauthorized` on protected endpoints

- Verify Clerk keys and callback URLs.
- Confirm middleware is active and routes are not incorrectly marked public.

### Upload initiation fails

- Check Appwrite project/database/bucket IDs.
- Verify `NEXT_APPWRITE_KEY` scopes include users, database, and storage.
- Ensure payload includes valid `fileName` and positive `size`.

### `429 Too many requests`

- Confirm `REDIS_URL` is valid and reachable.
- Review upload/download request bursts and client retry behavior.

### Download `403 Forbidden`

- Confirm ownership or active `file_shares` record exists.
- Verify storage permissions were synchronized during sharing updates.

### Redis not being used

- Ensure `REDIS_URL` is set at runtime.
- If unset/unreachable, the app falls back to bounded in-memory behavior.

---

Built by [Md Dawood Rahman](https://github.com/mddawoodrahman) and contributors.
