# Medusa

Medusa is a Next.js 15 file management app that uses Clerk for authentication and Appwrite for database and storage.

## Table of contents

- [What This App Does](#what-this-app-does)
- [Current Architecture](#current-architecture)
- [Tech Stack](#tech-stack)
- [Route Map](#route-map)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Appwrite Schema](#appwrite-schema)
- [Auth And Data Flow](#auth-and-data-flow)
- [Scripts](#scripts)
- [Recent Migration Notes](#recent-migration-notes)
- [Troubleshooting](#troubleshooting)

## What This App Does

- Authenticates users with Clerk (sign in/sign up/sign out)
- Uploads files to Appwrite Storage
- Persists file metadata in Appwrite Database
- Supports rename, delete, and shared-user list updates
- Provides dashboard stats, type filtering, sorting, and search

## Current Architecture

- Frontend: Next.js App Router + React 19 + Tailwind + shadcn/ui
- Auth: Clerk (`@clerk/nextjs`)
- Data/storage: Appwrite (`node-appwrite` server SDK)
- Server logic: Next.js Server Actions in `lib/actions`

Important implementation details based on current code:

- All non-auth routes are protected by Clerk middleware.
- Auth pages use optional catch-all routes:
   - `/sign-in/[[...rest]]`
   - `/sign-up/[[...rest]]`
- Root layout wraps app with `ClerkProvider`.
- On first authenticated request, the app creates a user document in Appwrite if it does not exist.
- File ownership is keyed by `clerkUserId`.

## Tech Stack

| Technology | Version | Purpose |
| --- | --- | --- |
| Next.js | 15.5.14 | App framework (App Router) |
| React | 19.0.0-rc | UI rendering |
| TypeScript | 5.x | Type safety |
| Clerk | 7.0.8 | Authentication and identity |
| node-appwrite | 14.2.0 | Appwrite server SDK |
| appwrite | 17.0.2 | Appwrite client package |
| Tailwind CSS | 3.4.1 | Styling |
| Recharts | 2.13.3 | Dashboard charts |

## Route Map

- Public routes:
   - `/sign-in/[[...rest]]`
   - `/sign-up/[[...rest]]`
- Protected routes:
   - `/(root)` group, including dashboard and file type pages

## Project Structure

```text
medusa-main/
   app/
      (auth)/
         sign-in/[[...rest]]/page.tsx
         sign-up/[[...rest]]/page.tsx
      (root)/
         layout.tsx
         page.tsx
         [type]/page.tsx
      layout.tsx
   components/
   constants/
   hooks/
   lib/
      actions/
         file.actions.ts
         user.actions.ts
      appwrite/
   scripts/
      setup-appwrite.js
   types/
```

## Getting Started

### 1. Clone

```bash
git clone https://github.com/your-username/medusa.git
cd medusa
```

### 2. Install dependencies

Preferred:

```bash
npm install
```

Alternative:

```bash
npm ci
```

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in values.

### 4. Set up Appwrite resources

```bash
node scripts/setup-appwrite.js
```

### 5. Run development server

Preferred:

```bash
npm run dev
```

Alternative:

```bash
npm run build && npm run start
```

Open `http://localhost:3000`.

## Environment Variables

Create `.env.local` in project root.

```env
# Appwrite
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=your_project_id
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
NEXT_PUBLIC_APPWRITE_DATABASE=your_database_id
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION=your_users_collection_id
NEXT_PUBLIC_APPWRITE_FILES_COLLECTION=your_files_collection_id
NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION=your_file_shares_collection_id
NEXT_PUBLIC_APPWRITE_BUCKET=your_bucket_id
NEXT_PUBLIC_APPWRITE_MAX_UPLOAD_SIZE=52428800
NEXT_APPWRITE_KEY=your_appwrite_api_key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

Notes:

- `NEXT_PUBLIC_APPWRITE_PROJECT` is used in app config.
- `scripts/setup-appwrite.js` accepts either `NEXT_PUBLIC_APPWRITE_PROJECT_ID` or `NEXT_PUBLIC_APPWRITE_PROJECT`.
- If you define both, keep them identical.

## Appwrite Schema

Users collection:

| Attribute | Type | Required |
| --- | --- | --- |
| fullName | String | Yes |
| email | Email | Yes |
| avatar | URL | Yes |
| clerkUserId | String | Yes |

Files collection:

| Attribute | Type | Required |
| --- | --- | --- |
| name | String | Yes |
| type | String | Yes |
| extension | String | Yes |
| url | URL | Yes |
| size | Integer | Yes |
| clerkUserId | String | Yes |
| ownerName | String | Yes |
| bucketField | String | Yes |
| users | String[] | No |

Bucket:

- Max size: 50MB
- File security: enabled

## Auth And Data Flow

1. User signs in with Clerk.
2. Clerk middleware protects non-auth routes.
3. `getCurrentUser` reads Clerk `userId` on the server.
4. If Appwrite user doc does not exist, app creates it using Clerk profile info.
5. Upload initiation is handled by `/api/upload/initiate`.
6. Browser uploads file binary directly to Appwrite Storage.
7. Server action stores metadata after successful upload.
8. File list queries use owner access and `file_shares` principals.

Security note:

- Files are private by default and never use public-read ACL.
- Access is enforced by owner and explicit shares.
- Download and view requests are served from `/api/files/download/:id` after authorization checks.

## Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| dev | `next dev --turbopack` | Start local dev server |
| typecheck | `tsc --noEmit` | Validate strict TypeScript types |
| lint | `eslint . --ext .ts,.tsx` | Run lint checks |
| test | `npm run test:unit && npm run test:integration` | Run test suites |
| build | `next build` | Build production bundle |
| start | `next start` | Start production server |
| ci:verify | `npm ci && npm run typecheck && npm run lint && npm run test && npm run build` | Run CI quality gates |

## Recent Migration Notes

Authentication was migrated from Appwrite auth to Clerk.

- Removed OTP/session/account flows from Appwrite auth
- Added Clerk middleware and provider
- Switched identity references from `accountId` to `clerkUserId`
- Updated user and file schemas in Appwrite setup script
- Updated protected routing and auth pages for Clerk path routing

If you have existing pre-migration data, migrate legacy records before production use:

- Users: map old `accountId` to `clerkUserId`
- Files: map old owner/account fields to `clerkUserId` and `ownerName`

## Troubleshooting

### Clerk SignIn/SignUp runtime route error

If Clerk says SignIn/SignUp is not configured correctly:

- Ensure routes are catch-all:
   - `/sign-in/[[...rest]]/page.tsx`
   - `/sign-up/[[...rest]]/page.tsx`
- Ensure middleware leaves `/sign-in(.*)` and `/sign-up(.*)` public.

### Unauthorized errors on file actions

- Confirm Clerk keys are valid.
- Confirm Appwrite user document is created with `clerkUserId`.
- Confirm collection IDs and API key in env are correct.

### Appwrite setup script project ID errors

If setup script fails with project ID errors, set at least one of:

- `NEXT_PUBLIC_APPWRITE_PROJECT`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
