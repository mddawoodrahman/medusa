<div align="center">

<img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" />
<img src="https://img.shields.io/badge/React-19_RC-61DAFB?style=flat-square&logo=react" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" />
<img src="https://img.shields.io/badge/Appwrite-Cloud-FD366E?style=flat-square&logo=appwrite" />
<img src="https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat-square&logo=clerk" />
<img src="https://img.shields.io/badge/CI-passing-22c55e?style=flat-square&logo=github-actions" />
<img src="https://img.shields.io/badge/License-MIT-f59e0b?style=flat-square" />

<br /><br />

# Medusa

**A secure, multi-user cloud file workspace — built for teams that care about access control.**

Upload, organize, preview, and share files with teammates. Every byte served through server-side authorization. Zero public URLs.

[**Live Demo →**](https://welovemedusa.vercel.app)&nbsp;&nbsp;·&nbsp;&nbsp;[Report Bug](../../issues)&nbsp;&nbsp;·&nbsp;&nbsp;[Request Feature](../../issues)

</div>

---

## Overview

Medusa is a production-grade file management platform built on **Next.js 15 App Router**, **Clerk**, and **Appwrite**. It enforces a private-by-default access model — no file is ever publicly accessible. Every download, preview, and thumbnail is streamed through a server-side authorization route.

```
Browser → Clerk Auth → Next.js Server Actions → Appwrite Repositories → Appwrite Cloud
                  ↓
         Protected File Proxy  →  Streamed Response (view / download / thumbnail)
```

---

## Features

| Feature | Description |
|---|---|
| 🔐 **Clerk Authentication** | Full route and API protection via Clerk middleware |
| ⚡ **Direct Browser Uploads** | Short-lived scoped Appwrite tokens — no server proxying |
| 🛡️ **Protected File Delivery** | All files streamed through server-side auth checks |
| 📂 **File Categorization** | Auto-sorted into documents, images, audio, video, and other |
| 🔎 **Search & Pagination** | Debounced search with cursor-based pagination |
| 🤝 **File Sharing** | Share by email with Appwrite Storage permission sync |
| 📊 **Dashboard Analytics** | Storage usage summary cards and recent-file activity |
| 🚦 **Rate Limiting** | Upload and download routes protected against abuse |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Runtime UI | React 19 RC |
| Auth | Clerk |
| Backend / Storage | Appwrite (Database + Storage + Users) |
| Styling | Tailwind CSS + shadcn/ui + Radix UI |
| Validation | Zod |
| Testing | Jest + ts-jest |
| Linting | ESLint + Prettier |
| CI/CD | GitHub Actions |

---

## Architecture

### Request Flow

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   Browser   │────▶│  Clerk Middleware │────▶│  Next.js App Router│
└─────────────┘     └──────────────────┘     └────────┬──────────┘
                                                       │
                          ┌────────────────────────────┤
                          ▼                            ▼
                  ┌──────────────┐           ┌─────────────────┐
                  │Server Actions│           │   API Routes    │
                  └──────┬───────┘           └────────┬────────┘
                         │                            │
                         ▼                            ▼
                  ┌──────────────┐           ┌─────────────────┐
                  │ Repositories │           │ File Proxy Route│
                  └──────┬───────┘           └────────┬────────┘
                         │                            │
                         ▼                            ▼
                  ┌──────────────────────────────────────────┐
                  │              Appwrite Cloud               │
                  │        (Database · Storage · Users)       │
                  └──────────────────────────────────────────┘
```

### Upload Flow

```
1.  Client → POST /api/upload/initiate   (file metadata + auth)
2.  Server → Validates auth, rate limits, issues short-lived Appwrite token
3.  Browser → Creates Appwrite session, uploads directly to storage
4.  Server Action → Persists metadata document to files collection
```

### Download / Thumbnail Flow

```
1.  Client → GET /api/files/download/[id]?mode=view|download|thumbnail
2.  Server → Validates auth + ownership/share access
3.  Server → Streams file with private cache headers
```

---

## Data Model

### `users`

| Field | Type | Description |
|---|---|---|
| `fullName` | string | Display name |
| `email` | email | Share lookup and identity |
| `avatar` | url | Profile image |
| `clerkUserId` | string | Primary app identity key |

### `files`

| Field | Type | Description |
|---|---|---|
| `name` | string | File name |
| `type` | string | `document` \| `image` \| `video` \| `audio` \| `other` |
| `extension` | string | Lowercase extension |
| `url` | url | Protected app URL |
| `size` | integer | File size in bytes |
| `clerkUserId` | string | Owner ID |
| `ownerName` | string | Owner snapshot |
| `bucketField` | string | Appwrite Storage file ID |
| `users` | string[] | Legacy share fallback |

### `file_shares`

| Field | Type | Description |
|---|---|---|
| `fileId` | string | File document ID |
| `principal` | string | Shared `clerkUserId` or email |
| `role` | string | `viewer` |
| `status` | string | `active` \| `inactive` |
| `ownerId` | string | Owner `clerkUserId` |
| `type` | string | Share strategy metadata |

---

## Security Model

- **Route protection** — Clerk middleware blocks all unauthenticated access to app routes and API endpoints.
- **Upload authorization** — Token issuance is gated by Clerk session validity and rate limits.
- **File delivery** — Every request to `/api/files/download/[id]` checks ownership or active share before streaming.
- **Storage permissions** — Appwrite Storage permissions are synchronized on every share/unshare operation.
- **No public URLs** — Zero public read permissions are ever granted. All file access flows through the protected proxy.

---

## API Reference

### `POST /api/upload/initiate`

Returns short-lived Appwrite credentials for direct browser uploads.

| Status | Condition |
|---|---|
| `200` | Credentials issued |
| `400` | Invalid payload |
| `401` | Unauthenticated |
| `413` | File exceeds size limit |
| `429` | Rate limit exceeded |

---

### `GET /api/files/download/[id]`

Streams a file with server-side authorization.

**Query Parameters**

| Param | Values | Description |
|---|---|---|
| `mode` | `view` \| `download` \| `thumbnail` | Delivery mode |
| `w` | integer | Thumbnail width (sanitized) |
| `h` | integer | Thumbnail height (sanitized) |

| Status | Condition |
|---|---|
| `200` | Streamed file |
| `400` | Invalid thumbnail mode for non-image |
| `401` | Unauthenticated |
| `403` | Access denied |

---

## Local Development

### Prerequisites

- **Bun** 1.1+ (recommended) or Node.js 20+ with npm
- Clerk application
- Appwrite project + database
- Appwrite API key with `users`, `database`, and `storage` scopes

### 1 — Install Dependencies

```bash
# Bun (recommended)
bun install

# npm
npm install
```

### 2 — Configure Environment

```bash
cp .env.example .env.local
```

Then fill in the values from the table in the [Environment Variables](#environment-variables) section.

### 3 — Bootstrap Appwrite Resources

```bash
node scripts/setup-appwrite.js
```

This script creates or reuses collections and the storage bucket, then prints generated IDs to copy into your `.env.local`.

### 4 — Start Development Server

```bash
# Bun (Turbopack)
bun run dev

# npm
npm run dev
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | ✅ | Appwrite endpoint URL |
| `NEXT_PUBLIC_APPWRITE_PROJECT` | ✅ | Appwrite project ID |
| `NEXT_PUBLIC_APPWRITE_DATABASE` | ✅ | Appwrite database ID |
| `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION` | ✅ | `users` collection ID |
| `NEXT_PUBLIC_APPWRITE_FILES_COLLECTION` | ✅ | `files` collection ID |
| `NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION` | ⚠️ Recommended | `file_shares` collection ID |
| `NEXT_PUBLIC_APPWRITE_BUCKET` | ✅ | Appwrite storage bucket ID |
| `NEXT_PUBLIC_APPWRITE_MAX_UPLOAD_SIZE` | Optional | Max upload bytes (default: `52428800`) |
| `NEXT_APPWRITE_KEY` | ✅ | Appwrite server API key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ | Sign-in route |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ | Sign-up route |

---

## Scripts & Quality Gates

| Script | Purpose |
|---|---|
| `dev` | Start Next.js dev server with Turbopack |
| `build` | Production build |
| `start` | Start production server |
| `typecheck` | TypeScript compile check |
| `lint` | ESLint checks |
| `test:unit` | Unit-focused Jest run |
| `test:integration` | Integration test suite |
| `test:e2e` | Critical-journey tests |
| `test` | Unit + integration |
| `ci:verify` | Fresh install + full verification pipeline |
| `test:ci` | Typecheck + lint + test + build |

---

## CI / CD

GitHub Actions workflow triggers on:
- Push to `main` and `dev`
- Pull requests targeting `main`

**Pipeline stages:**

```
Install → Typecheck → Lint → Test → Build
```

---

## Repository Structure

```
.
├── app/
│   ├── (auth)/           # Auth routes (sign-in, sign-up)
│   ├── (root)/           # Protected app routes
│   └── api/              # Upload initiation + file proxy routes
├── components/           # Shared UI components
├── constants/            # App-wide constants
├── hooks/                # Custom React hooks
├── lib/
│   ├── actions/          # Server Actions (domain logic)
│   ├── appwrite/         # Appwrite client + admin client
│   ├── observability/    # Structured logging utilities
│   ├── repositories/     # Appwrite data access layer
│   └── security/         # Auth checks + rate limiting
├── scripts/              # Appwrite bootstrap script
├── test/                 # Unit, integration, and e2e suites
└── types/                # Shared TypeScript types
```

---

## Known Constraints

- Dashboard storage chart uses a hardcoded **2 GB** cap in application logic.
- Rate limiter uses **process memory** — single-instance only; not suitable for horizontal scale as-is.
- `test:e2e` runs Jest route tests, **not** browser-driven automation.
- Setup script is a bootstrap tool, **not** a versioned migration system.
- React is pinned to **RC builds**, introducing long-term upgrade risk.

---

## Roadmap

### Priority 1 — Reliability & Scale
- [ ] Precomputed per-user storage aggregates (remove dashboard scan cost)
- [ ] Distributed rate limiting (Redis-backed)
- [ ] Explicit action result contracts for deterministic UI state

### Priority 2 — Quality & Correctness
- [ ] Browser-driven E2E suite (Playwright)
- [ ] Versioned migration system to replace setup script
- [ ] Optimized share-lookup query path for higher collaboration volume

### Priority 3 — Sustainability
- [ ] Stabilize React dependency off RC channel
- [ ] Distributed tracing + latency dashboards

---

## Troubleshooting

<details>
<summary><strong>Sign-in / Sign-up not working</strong></summary>

- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are correct.
- Confirm `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `SIGN_UP_URL` match your actual route paths.
- Ensure auth routes are listed as public in middleware config.

</details>

<details>
<summary><strong>Upload initiation returns 401</strong></summary>

- Confirm an active Clerk session exists in the browser.
- Check that the `users` collection ID env variable is set correctly.
- Verify your Appwrite API key has `users` and `database` scopes.
- Confirm user profile provisioning is completing successfully.

</details>

<details>
<summary><strong>Download returns 403</strong></summary>

- Verify ownership of the file or that an active share record exists.
- Confirm `NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION` is configured.
- Verify that storage permissions were updated when the share was created.

</details>

<details>
<summary><strong>Setup script fails</strong></summary>

- Confirm `.env.local` exists and all required values are set.
- Ensure the target Appwrite database already exists before running the script.
- Verify the API key includes `users`, `database`, and `storage` scopes.

</details>

---

<div align="center">

Built by [Md Dawood Rahman](https://github.com/mddawoodrahman) &nbsp;·&nbsp; [Live Demo](https://welovemedusa.vercel.app) &nbsp;·&nbsp; [IIT Patna MCA '27]

</div>
