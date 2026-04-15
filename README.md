<div align="center">

<br />

<h1>
  <img src="https://img.shields.io/badge/🪼-Medusa-000000?style=for-the-badge" alt="Medusa" />
</h1>

<p align="center">
  <strong>Authorization-first cloud file workspace for teams.</strong><br />
  Upload, organize, preview, and share files — with every byte protected behind server-side authorization.<br />
  No public storage URLs. No exposed credentials. No shortcuts.
</p>

<br />

<!-- Badges Row 1: Stack -->
<p>
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19_RC-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19 RC" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Appwrite-Cloud-FD366E?style=flat-square&logo=appwrite&logoColor=white" alt="Appwrite Cloud" />
  <img src="https://img.shields.io/badge/Redis-ioredis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat-square&logo=clerk&logoColor=white" alt="Clerk" />
</p>

<!-- Badges Row 2: Quality -->
<p>
  <img src="https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Testing-Jest-C21325?style=flat-square&logo=jest&logoColor=white" alt="Jest" />
  <img src="https://img.shields.io/badge/License-Apache_2.0-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
</p>

<br />

**[🚀 Live Demo](https://welovemedusa.vercel.app)** &nbsp;·&nbsp; **[🐛 Report Bug](../../issues)** &nbsp;·&nbsp; **[✨ Request Feature](../../issues)** &nbsp;·&nbsp; **[⭐ Star this repo](#)**

<br />

</div>

---

## Why Medusa?

Most file storage solutions expose raw storage URLs or rely on client-side access tokens — making it trivial to bypass authorization entirely. Medusa is built differently.

**The core principle:** every file request passes through a server-side authorization layer before a single byte is delivered. There are no public bucket URLs. No signed URLs shared with the client. No workarounds.

| The Problem | The Medusa Solution |
|---|---|
| Cloud storage SDKs expose public-read URLs | All file delivery is proxied through a protected Next.js API route |
| Upload tokens are often long-lived and over-scoped | Short-lived, scoped Appwrite credentials issued per upload session |
| Rate limiting is bolted on as an afterthought | Redis-backed distributed rate limiting is built into every ingress/egress path |
| File sharing bypasses storage permission systems | Sharing synchronizes Appwrite Storage permissions atomically |
| Storage analytics require expensive full-table scans | Per-user counters tracked atomically in Redis for instant quota reads |

Medusa is purpose-built as a **production-grade reference implementation** — a platform you can fork, extend, and ship with confidence.

---

## Features

### 🔐 Security & Authorization
- **Auth-gated every route** — Clerk middleware enforces authentication on all application and API routes
- **Protected file proxy** — Downloads, previews, and thumbnails are streamed server-side after ownership/share verification; no client ever touches a raw storage URL
- **Short-lived upload credentials** — Scoped Appwrite tokens are issued per upload session and expire immediately after use
- **Storage permission sync** — File sharing updates Appwrite Storage ACLs atomically, not just metadata

### ⚡ Performance & Reliability
- **Redis cache-first reads** — File metadata, listings, and dashboard totals are served from cache with targeted mutation invalidation
- **Distributed rate limiting** — Fixed-window Redis limits with user + IP dual scoping on upload and download routes; falls back to bounded in-process memory if Redis is unavailable
- **Direct browser uploads** — Files go from browser to Appwrite Storage without transiting the Next.js server, eliminating upload bottlenecks
- **Atomic usage counters** — Per-user upload and download counters tracked in Redis for quota enforcement and SaaS analytics

### 🗂️ File Management
- **Category-aware organization** — Documents, images, audio, video, and other file types are grouped automatically
- **Debounced search + pagination** — Fast file discovery across large libraries without overfetching
- **Email-based file sharing** — Share individual files with any user by email; permissions are provisioned server-side
- **Dashboard analytics** — Storage usage summary and recent file activity at a glance

### 🛠️ Developer Experience
- **Full TypeScript** — End-to-end type safety from API routes to React components
- **Repository pattern** — Clean separation between domain logic and Appwrite data access
- **Structured logging** — Request IDs threaded through server-side logs for traceability
- **CI quality gate** — Typecheck → Lint → Test → Build pipeline runs on every push and pull request
- **One-command bootstrap** — `setup-appwrite.js` provisions all Appwrite collections and the storage bucket automatically

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | **Next.js 15** App Router | Server Actions, API Routes, Middleware |
| UI Runtime | **React 19 RC** | Component rendering |
| Language | **TypeScript 5** | End-to-end type safety |
| Authentication | **Clerk** | Route protection, session management, user identity |
| Distributed Cache & Rate Limiting | **Redis** (ioredis) | Cache-first reads, fixed-window rate limits, atomic counters |
| Backend & Storage | **Appwrite** Cloud | Database, object storage, storage permissions |
| Styling | **Tailwind CSS** + **shadcn/ui** + **Radix UI** | Component library, accessible primitives |
| Validation | **Zod** | Runtime schema validation on all API inputs |
| Testing | **Jest** + **ts-jest** | Unit, integration, and critical-journey tests |
| Linting & Formatting | **ESLint** + **Prettier** | Code quality enforcement |
| CI/CD | **GitHub Actions** | Automated quality gate pipeline |
| Deployment | **Vercel** | Edge-optimized Next.js hosting |

---

## Architecture

### High-Level Request Flow

```
                         ┌─────────────────────────────────────────────────────┐
                         │                    Browser                          │
                         └───────────────────────┬─────────────────────────────┘
                                                 │
                                    ┌────────────▼────────────┐
                                    │     Clerk Middleware     │  ← Route & API auth
                                    └────────────┬────────────┘
                                                 │
                                    ┌────────────▼────────────┐
                                    │  Next.js App Router     │
                                    │  (Server Actions /      │
                                    │   API Routes)           │
                                    └────────────┬────────────┘
                                                 │
                         ┌───────────────────────▼──────────────────────────┐
                         │              Redis Layer                         │
                         │   Rate Limits │ Cache │ Usage Counters           │
                         └───────────────────────┬──────────────────────────┘
                                                 │
                                    ┌────────────▼────────────┐
                                    │   Repository Layer      │  ← Data access abstraction
                                    └────────────┬────────────┘
                                                 │
                                    ┌────────────▼────────────┐
                                    │    Appwrite Cloud       │
                                    │  Database │ Storage     │
                                    └─────────────────────────┘
```

### Upload Flow

```
1.  Browser        →  POST /api/upload/initiate  (file metadata)
2.  Server         →  Validates auth + applies Redis rate limit
3.  Server         →  Issues short-lived, scoped Appwrite token
4.  Browser        →  Uploads directly to Appwrite Storage using token
5.  Server Action  →  Persists file metadata document to Appwrite Database
6.  Redis          →  Invalidates affected cache keys; increments upload counter
```

### Download / Preview / Thumbnail Flow

```
1.  Browser  →  GET /api/files/download/[id]?mode=view|download|thumbnail
2.  Server   →  Validates Clerk session + applies Redis rate limit
3.  Server   →  Checks ownership or active file_shares record
4.  Server   →  Streams file bytes with private cache headers
                (Redis increments download counter atomically)
```

---

## Project Structure

```
.
├── app/
│   ├── (auth)/              # Clerk sign-in and sign-up routes
│   ├── (root)/              # Protected application routes (dashboard, files, shared)
│   └── api/
│       ├── upload/          # Upload credential initiation endpoint
│       └── files/           # Protected file proxy (download/view/thumbnail)
│
├── components/              # Shared, reusable React UI components
├── constants/               # Application-wide constants (file types, limits, etc.)
├── hooks/                   # Custom React hooks
│
├── lib/
│   ├── actions/             # Next.js Server Actions and domain workflows
│   ├── appwrite/            # Appwrite SDK configuration and client factories
│   ├── observability/       # Structured logging with request ID propagation
│   ├── repositories/        # Appwrite data access layer (users, files, shares)
│   └── security/            # Redis rate limiting and security utilities
│
├── scripts/
│   └── setup-appwrite.js    # One-time bootstrap: creates collections + bucket
│
├── test/
│   ├── unit/                # Isolated unit tests
│   ├── integration/         # Integration tests against real services
│   └── e2e/                 # Critical-journey route tests
│
└── types/                   # Shared TypeScript types and interfaces
```

---

## Data Model

### `users` Collection

| Field | Type | Description |
|---|---|---|
| `fullName` | `string` | User display name |
| `email` | `email` | Used for share lookup and identity |
| `avatar` | `url` | Profile avatar URL |
| `clerkUserId` | `string` | Primary identity key — maps to Clerk user |

### `files` Collection

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Original file name |
| `type` | `string` | `document` · `image` · `video` · `audio` · `other` |
| `extension` | `string` | Lowercase file extension (e.g., `pdf`, `png`) |
| `url` | `url` | Application-internal protected URL |
| `size` | `integer` | File size in bytes |
| `clerkUserId` | `string` | Owner's Clerk user ID |
| `ownerName` | `string` | Snapshot of owner display name at upload time |
| `bucketField` | `string` | Appwrite Storage object ID |
| `users` | `string[]` | Legacy share fallback (superseded by `file_shares`) |

### `file_shares` Collection

| Field | Type | Description |
|---|---|---|
| `fileId` | `string` | References the `files` document ID |
| `principal` | `string` | Shared Clerk user ID or email address |
| `role` | `string` | Share role — currently `viewer` |
| `status` | `string` | `active` or `inactive` |
| `ownerId` | `string` | Owner's Clerk user ID |
| `type` | `string` | Share strategy metadata |

---

## Security Model

Medusa is built with a **deny-by-default** posture. No resource is accessible without passing an explicit authorization check.

| Layer | Mechanism |
|---|---|
| **Route protection** | Clerk middleware wraps all application routes and API handlers |
| **Upload authorization** | Requires a valid Clerk session and a provisioned user profile before credentials are issued |
| **File delivery authorization** | Checks ownership or an active `file_shares` record before streaming any byte |
| **Storage ACL sync** | Appwrite Storage permissions are updated atomically when shares are created or revoked |
| **No public storage access** | Public read permissions are never granted on the Appwrite bucket; all access flows through the proxy |
| **Rate limiting** | Redis-backed fixed-window limits with user + IP dual-scoping on all upload and download routes |
| **Fallback rate limiting** | If Redis is unavailable, bounded in-process memory limits apply to prevent complete bypass |

> **Important for self-hosting:** Never grant public read permissions on your Appwrite storage bucket. All file access must route through `/api/files/download/[id]`.

---

## Performance Optimizations

| Optimization | Implementation |
|---|---|
| **Cache-first file reads** | File metadata, directory listings, and dashboard totals are read from Redis before hitting Appwrite |
| **Mutation invalidation** | Cache keys are invalidated on upload, rename, delete, and share operations — no stale reads |
| **Atomic counters** | Upload and download counters in Redis use atomic `INCR` — safe under concurrent load |
| **Direct browser upload** | Upload payloads never transit the Next.js server; credentials are issued and the browser uploads directly to Appwrite |
| **Debounced search** | Search input is debounced client-side to avoid per-keystroke requests |
| **Paginated listings** | File lists are paginated at the repository layer — no full-table scans in the hot path |

---

## API Reference

### `POST /api/upload/initiate`

Issues short-lived Appwrite credentials for a direct browser upload.

**Request body:**

```json
{
  "fileName": "report.pdf",
  "fileSize": 204800,
  "mimeType": "application/pdf"
}
```

**Responses:**

| Status | Condition |
|---|---|
| `200` | Credentials issued successfully |
| `400` | Invalid or missing payload fields |
| `401` | Unauthenticated or user profile not provisioned |
| `413` | File size exceeds `NEXT_PUBLIC_APPWRITE_MAX_UPLOAD_SIZE` |
| `429` | Rate limit exceeded |

---

### `GET /api/files/download/[id]`

Streams a file after server-side ownership or share verification.

**Query parameters:**

| Parameter | Values | Description |
|---|---|---|
| `mode` | `view` · `download` · `thumbnail` | Controls `Content-Disposition` and delivery behavior |
| `w` | integer | Thumbnail width (images only); sanitized server-side |
| `h` | integer | Thumbnail height (images only); sanitized server-side |

**Responses:**

| Status | Condition |
|---|---|
| `200` | File streamed successfully |
| `400` | Thumbnail mode requested for a non-image file |
| `401` | Unauthenticated or user profile not provisioned |
| `403` | Requester is neither the owner nor an active share recipient |
| `404` | Appwrite Storage object ID missing from the file document |
| `429` | Rate limit exceeded |

---

## Local Development

### Prerequisites

Before starting, ensure you have the following:

- **Runtime:** Bun 1.1+ or Node.js 20+ with npm
- **Auth:** [Clerk](https://clerk.com) application (free tier is sufficient)
- **Backend:** [Appwrite Cloud](https://appwrite.io) project with a database created
- **Appwrite API key:** scopes must include `users`, `databases`, and `storage`
- **Redis:** local instance (`redis-server`) or a managed service (e.g., Upstash, Azure Cache for Redis)

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/mddawoodrahman/medusa.git
cd medusa
```

### Step 2 — Install dependencies

```bash
# Using Bun (recommended)
bun install

# Using npm
npm install
```

### Step 3 — Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in all required values. See the [Environment Variables](#environment-variables) section for the full reference.

### Step 4 — Bootstrap Appwrite resources

```bash
node scripts/setup-appwrite.js
```

This script creates (or reuses) the `users`, `files`, and `file_shares` collections and the storage bucket in your Appwrite project. It prints the generated resource IDs — copy them into `.env.local` before continuing.

### Step 5 — Start the development server

```bash
# Using Bun
bun run dev

# Using npm
npm run dev
```

The app is now running at [http://localhost:3000](http://localhost:3000).

---

### Run with Docker Compose (App + Redis)

Medusa includes first-class Docker support:

- `Dockerfile` uses a multi-stage build (`deps` -> `builder` -> `runner`) and runs Next.js in standalone production mode.
- `docker-compose.yml` starts two services:
  - `app` (Next.js server on port `3000`)
  - `redis` (Redis 7 on port `6379` with a persistent named volume)

#### 1. Prepare environment variables

```bash
cp .env.example .env.local
```

Set all required Appwrite and Clerk values in `.env.local`.

> In Compose mode, `REDIS_URL` is forced to `redis://redis:6379` for the `app` service, so the app talks to the Redis container by service name.

#### 2. Build and start containers

```bash
docker compose up --build
```

App URL: [http://localhost:3000](http://localhost:3000)

#### 3. Verify startup health

The startup probe endpoint validates both Redis connectivity and Appwrite bucket configuration.

```bash
# If STARTUP_HEALTH_TOKEN is NOT set
curl http://localhost:3000/api/health/startup

# If STARTUP_HEALTH_TOKEN is set
curl -H "x-startup-health-token: <your-token>" http://localhost:3000/api/health/startup
```

#### 4. Stop containers

```bash
# Stop services
docker compose down

# Stop services and remove Redis volume
docker compose down -v
```

#### Useful operational commands

```bash
# Follow app logs
docker compose logs -f app

# Follow redis logs
docker compose logs -f redis

# Rebuild app image after dependency/code changes
docker compose build --no-cache app
```

### Run as a standalone production container

Use this when Redis is managed externally (Upstash, Azure Cache for Redis, self-hosted TLS Redis, etc.).

```bash
docker build -t medusa:latest .

docker run --rm \
  -p 3000:3000 \
  --env-file .env.local \
  -e REDIS_URL=rediss://<user>:<password>@<host>:<port> \
  medusa:latest
```

> The container image runs in production mode (`NODE_ENV=production`) and serves the standalone Next.js server (`server.js`).

---

## Environment Variables

Copy `.env.example` to `.env.local` and set the following:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Optional | Public base URL used by client/server link generation (e.g., `http://localhost:3000`) |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | ✅ Yes | Your Appwrite project endpoint URL |
| `NEXT_PUBLIC_APPWRITE_PROJECT` | ✅ Yes | Appwrite project ID |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Optional | Backward-compatible project ID alias |
| `NEXT_PUBLIC_APPWRITE_DATABASE` | ✅ Yes | Appwrite database ID |
| `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION` | ✅ Yes | `users` collection ID |
| `NEXT_PUBLIC_APPWRITE_FILES_COLLECTION` | ✅ Yes | `files` collection ID |
| `NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION` | ⚠️ Recommended | `file_shares` collection ID (required for sharing) |
| `NEXT_PUBLIC_APPWRITE_BUCKET` | ✅ Yes | Appwrite storage bucket ID |
| `NEXT_PUBLIC_APPWRITE_MAX_UPLOAD_SIZE` | Optional | Max upload size in bytes — default `52428800` (50 MB) |
| `NEXT_APPWRITE_KEY` | ✅ Yes | Appwrite **server** API key (never expose to the client) |
| `STARTUP_HEALTH_TOKEN` | Optional | If set, `/api/health/startup` requires the `x-startup-health-token` header |
| `REDIS_URL` | ⚠️ Recommended | Redis connection string — `redis://localhost:6379` locally, `rediss://...` for TLS |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | ✅ Yes | Clerk secret key (server-side only) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ Yes | Sign-in route (e.g., `/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ Yes | Sign-up route (e.g., `/sign-up`) |

> ⚠️ **Never commit `.env.local` to version control.** The `NEXT_APPWRITE_KEY` and `CLERK_SECRET_KEY` values are server-side secrets.

---

## Scripts & Quality Gates

| Script | Description |
|---|---|
| `dev` | Start the development server with Turbopack |
| `build` | Create an optimized production build |
| `start` | Start the production server |
| `typecheck` | Run `tsc --noEmit` — type checks the full codebase |
| `lint` | Run ESLint across all source files |
| `test` | Run unit and integration tests |
| `test:unit` | Run unit-focused Jest tests only |
| `test:integration` | Run integration tests |
| `test:e2e` | Run critical-journey route tests |
| `test:watch` | Run Jest in interactive watch mode |
| `ci:verify` | Full gate: clean install → typecheck → lint → test → build |
| `test:ci` | CI gate: typecheck → lint → test → build |

---

## Deployment

### Deploying to Vercel (Recommended)

1. Push your repository to GitHub.
2. Import the repo in [Vercel](https://vercel.com/new).
3. Add all environment variables from `.env.local` in the Vercel project settings under **Environment Variables**.
4. Deploy. Vercel auto-detects Next.js 15 — no additional configuration is needed.

> Ensure `REDIS_URL` points to a managed Redis instance (e.g., [Upstash](https://upstash.com) for serverless-compatible Redis) when deploying to Vercel's edge network.

### Redis Options

| Provider | Notes |
|---|---|
| [Upstash](https://upstash.com) | Serverless-compatible, free tier available, REST + ioredis support |
| [Azure Cache for Redis](https://azure.microsoft.com/en-us/products/cache) | Recommended for Azure-co-located deployments |
| Self-hosted | Use `redis://` locally or `rediss://` with TLS in production |

### CI/CD Pipeline

GitHub Actions runs automatically on:
- Pushes to `main` and `dev`
- Pull requests targeting `main`

```
Install dependencies
      ↓
  Typecheck
      ↓
    Lint
      ↓
    Test
      ↓
   Build
```

---

## Roadmap

### 🔴 Priority 1 — Reliability & Scale

- [ ] Precompute per-user storage aggregates to eliminate dashboard full-scan cost
- [ ] Plan-aware quota enforcement using existing Redis usage counters
- [ ] Explicit Server Action result contracts for deterministic client UI state

### 🟡 Priority 2 — Quality & Correctness

- [ ] Browser-driven E2E tests for upload, share, preview, and download flows (Playwright)
- [ ] Replace one-time bootstrap script with a versioned Appwrite migration system
- [ ] Optimize shared-file lookup queries for higher collaboration volume

### 🟢 Priority 3 — Sustainability

- [ ] Stabilize on a non-RC React release once React 19 reaches stable
- [ ] Add distributed tracing (OpenTelemetry) and latency dashboards

---

## Known Constraints

- Dashboard storage usage is capped at **2 GB** in current application logic — this is a hardcoded limit, not a platform restriction.
- `REDIS_URL` is optional but **strongly recommended**. Without it, rate limiting falls back to bounded in-process memory, which does not survive restarts or scale horizontally.
- `test:e2e` runs Jest-based route tests — browser-driven automation with Playwright is on the roadmap.
- `scripts/setup-appwrite.js` is a **bootstrap tool**, not a versioned migration system. Running it against an existing project is safe (it reuses existing resources), but schema changes must be applied manually.
- React is pinned to RC builds while the project consumes React 18 type packages. Stabilization is tracked in the roadmap.

---

## Contributing

Contributions are welcome. Please follow these steps:

1. **Fork** this repository and create a new branch: `git checkout -b feat/your-feature-name`
2. **Make your changes** — keep commits atomic and well-described
3. **Run the quality gate** before submitting: `npm run ci:verify`
4. **Open a pull request** targeting the `dev` branch with a clear description of what changed and why

For larger changes, open an issue first to discuss the approach.

> All pull requests must pass the full CI pipeline (typecheck → lint → test → build) before review.

---

## Troubleshooting

<details>
<summary><strong>Sign-in or sign-up does not work</strong></summary>

- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are correctly set.
- Confirm `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL` match the actual route paths in your app.
- Ensure auth routes are listed as public in `middleware.ts` so Clerk allows unauthenticated access to the sign-in/sign-up pages.

</details>

<details>
<summary><strong>Upload initiation returns <code>401</code></strong></summary>

- Confirm an active Clerk session exists in the browser (check browser devtools → Application → Cookies).
- Verify `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION` is set to the correct collection ID.
- Confirm the Appwrite API key (`NEXT_APPWRITE_KEY`) has `users`, `databases`, and `storage` scopes.
- Check that the user profile provisioning step completed successfully after sign-up.

</details>

<details>
<summary><strong>Upload initiation returns <code>500</code> on Vercel</strong></summary>

- Open Vercel Function logs and search for `Upload initiation blocked: missing runtime configuration` or `Upload backend configuration is invalid`.
- Ensure these variables are present in Vercel: `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT` (or `NEXT_PUBLIC_APPWRITE_PROJECT_ID`), `NEXT_PUBLIC_APPWRITE_BUCKET`, `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION`, and `NEXT_APPWRITE_KEY`.
- This project also accepts common aliases (`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_BUCKET_ID`, `APPWRITE_USERS_COLLECTION_ID`, `APPWRITE_API_KEY`) if your deployment already uses them.
- Confirm the Appwrite API key has `users`, `databases`, and `storage` scopes.
- Hit `/api/health/startup` on the deployed site to validate Appwrite bucket configuration and Redis connectivity.

</details>

<details>
<summary><strong>File download returns <code>403</code></strong></summary>

- Verify the requesting user owns the file or has an active record in the `file_shares` collection.
- Confirm `NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION` is set — without it, share lookups fail silently.
- Re-check that Appwrite Storage permissions were updated when the share was created.

</details>

<details>
<summary><strong>Setup script fails</strong></summary>

- Confirm `.env.local` exists and all required values are populated before running the script.
- Ensure the target Appwrite database exists in your project — the script does not create the database itself.
- Verify the Appwrite API key includes `users`, `databases`, and `storage` scopes.

</details>

<details>
<summary><strong>Rate limiting is not working</strong></summary>

- Check that `REDIS_URL` is set and your Redis instance is reachable from the deployment environment.
- For Vercel deployments, use a managed Redis provider with TLS (`rediss://`) — local Redis is not accessible from Vercel's edge network.
- If Redis is intentionally omitted, rate limiting falls back to in-process memory; this is expected behavior.

</details>

---

## License

Distributed under the **Apache License 2.0**. See [`LICENSE`](./LICENSE) for the full text.

---

<div align="center">

<br />

**If Medusa is useful to you, consider giving it a ⭐ — it helps more developers find the project.**

<br />

Built by [Md Dawood Rahman](https://github.com/mddawoodrahman) &nbsp;·&nbsp; [Live Demo](https://welovemedusa.vercel.app) &nbsp;·&nbsp; IIT Patna MCA '27

<br />

</div>
