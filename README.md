# Medusa

Medusa is a Next.js 15 file management application built around Clerk authentication and Appwrite storage. Authenticated users can upload files directly to Appwrite with short-lived scoped sessions, browse their library by type, search and sort files, share access with other users, and open downloads through protected application routes instead of public bucket URLs.

## Live

https://welovemedusa.vercel.app/

## Overview

- Clerk handles sign-up, sign-in, session state, and route protection.
- Appwrite stores user records, file metadata, sharing records, and file binaries.
- Next.js Server Actions implement the authenticated file operations.
- Secure API routes proxy view, download, and thumbnail access after authorization checks.
- The UI includes a dashboard, recent uploads, type-based library pages, drag-and-drop upload, dark mode, and file actions for rename, share, details, download, and delete.

## Core Features

- Clerk-protected App Router application with path-based auth routes
- Automatic Appwrite user provisioning on first authenticated request
- Direct browser-to-Appwrite uploads using short-lived Appwrite user tokens
- File categorization into documents, images, video, audio, and other
- Dashboard storage summary with recent file activity
- Search, sort, and cursor-based pagination for file browsing
- File sharing by email, backed by storage permissions plus share records
- Protected file view, download, and thumbnail endpoints
- Structured JSON logging with request IDs
- Light and dark theme toggle persisted in local storage

## Tech Stack

| Layer | Implementation |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI | React 19 RC, Tailwind CSS, shadcn/ui, Radix UI |
| Auth | Clerk |
| Storage and database | Appwrite |
| Charts | Recharts |
| Forms and validation | React Hook Form, Zod |
| Testing | Jest with `ts-jest` |
| Language and tooling | TypeScript, ESLint, Prettier |

## Architecture

### Request flow

1. Clerk middleware protects every non-auth route.
2. `getCurrentUser()` resolves the active Clerk user and creates a matching Appwrite `users` document if none exists.
3. File actions in `lib/actions/file.actions.ts` call repository helpers in `lib/repositories`.
4. Repositories use the Appwrite admin client from `lib/appwrite/index.ts`.
5. Files are stored in Appwrite Storage, but all application file URLs point back to `/api/files/download/[id]`.

### Upload flow

1. The `FileUploader` component calls `POST /api/upload/initiate`.
2. The route verifies the Clerk session, ensures an Appwrite auth user exists, and creates a short-lived Appwrite token.
3. The browser creates an Appwrite session with that token and uploads the file directly to Storage.
4. After the binary upload succeeds, `createFileMetadata()` stores the file document in Appwrite with a protected internal URL like `/api/files/download/:id?mode=view`.

### Access and sharing flow

1. Owned files are queried by `clerkUserId`.
2. Shared visibility is resolved from `file_shares` when configured.
3. If `NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION` is not configured, the app falls back to the legacy `users` email array on the `files` document.
4. The secure download route checks ownership or share access before returning a view stream, download stream, or image thumbnail.
5. Share updates modify both Appwrite Storage permissions and the metadata/share collections.

## Route Map

### Public routes

- `/sign-in/[[...rest]]`
- `/sign-up/[[...rest]]`

### Protected routes

- `/` - dashboard with storage breakdown and recent files
- `/documents`
- `/images`
- `/media`
- `/others`

### Protected API routes

- `POST /api/upload/initiate` - returns scoped Appwrite upload credentials
- `GET /api/files/download/[id]?mode=view|download|thumbnail` - authorized file delivery

## Project Structure

```text
app/
  (auth)/
    sign-in/[[...rest]]/page.tsx
    sign-up/[[...rest]]/page.tsx
  (root)/
    layout.tsx
    page.tsx
    [type]/page.tsx
  api/
    upload/initiate/route.ts
    files/download/[id]/route.ts
components/
  FileUploader.tsx
  Search.tsx
  ActionDropdown.tsx
  Sidebar.tsx
  MobileNavigation.tsx
lib/
  actions/
  appwrite/
  observability/
  repositories/
scripts/
  setup-appwrite.js
test/
  middleware.test.ts
  integration/
  e2e/
```

## Appwrite Data Model

### `users` collection

| Field | Type | Notes |
| --- | --- | --- |
| `fullName` | string | Display name from Clerk profile |
| `email` | email | Used for lookup and sharing |
| `avatar` | url | Clerk image or placeholder |
| `clerkUserId` | string | Primary identity key for the app |

### `files` collection

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Stored file name |
| `type` | string | `document`, `image`, `video`, `audio`, or `other` |
| `extension` | string | Lowercased file extension |
| `url` | url | Internal app URL, not a public Appwrite URL |
| `size` | integer | Original size in bytes |
| `clerkUserId` | string | Owner identity |
| `ownerName` | string | Snapshot of owner name |
| `bucketField` | string | Appwrite Storage file ID |
| `users` | string[] | Legacy shared-email fallback |

### `file_shares` collection

| Field | Type | Notes |
| --- | --- | --- |
| `fileId` | string | Related `files` document ID |
| `principal` | string | Shared Clerk user ID or email |
| `role` | string | Currently `viewer` |
| `status` | string | Currently `active` |
| `ownerId` | string | Owning Clerk user ID |
| `type` | string | Currently `direct` |

### Storage bucket

- File security is expected to stay enabled.
- The application currently enforces a 50 MB client-side upload limit by default.
- The dashboard storage ring is a UI quota based on a fixed 2 GB cap in `getTotalSpaceUsed()`.

## Important Implementation Notes

- Files are private by default. The code never grants public read permissions.
- Thumbnails for protected images are served through `mode=thumbnail`, which uses Appwrite previews under the same authorization gate.
- The app creates a deterministic Appwrite auth-user ID from the Clerk user ID so upload permissions can be scoped to actual Appwrite users.
- The setup script creates collections and a bucket, but it expects an existing Appwrite database ID in `.env.local`.
- The current setup script bucket allowlist is narrow: `jpg`, `png`, `pdf`, `docx`, and `mp4`. Expand it if you want the broader set of file types recognized by the UI.

## Local Development

### Prerequisites

- Node.js 20+
- npm
- A Clerk application
- An Appwrite project
- An Appwrite database created ahead of time
- An Appwrite API key with database, users, and storage access

### 1. Install dependencies

```bash
npm install
```

### 2. Create local environment configuration

Start from `.env.example`, then add the full set of variables below to `.env.local`:

```env
# Appwrite
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=your_project_id
# or NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
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
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

Notes:

- `NEXT_PUBLIC_APPWRITE_PROJECT` and `NEXT_PUBLIC_APPWRITE_PROJECT_ID` are treated as aliases. Set one or keep both identical.
- `NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION` is optional in code, but recommended.
- `NEXT_PUBLIC_APPWRITE_MAX_UPLOAD_SIZE` defaults to 50 MB if omitted.
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL` should point to your local auth routes so middleware redirects stay in-app.

### 3. Bootstrap Appwrite collections and bucket

```bash
node scripts/setup-appwrite.js
```

The script:

- loads `.env.local`
- creates or reuses the `users`, `files`, and `file_shares` collections
- creates the storage bucket
- adds basic file and share indexes

After the script runs, copy the generated collection IDs and bucket ID into `.env.local` if needed.

### 4. Start the app

```bash
npm run dev
```

Then open `http://localhost:3000`.

## NPM Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server with Turbopack |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run unit-style Jest tests outside `test/integration` |
| `npm run test:integration` | Run mocked integration tests |
| `npm run test:e2e` | Run the Jest-based critical-journey test file |
| `npm run test` | Run unit and integration suites |
| `npm run build` | Build the production app |
| `npm run start` | Start the production server |
| `npm run ci:verify` | Fresh install plus typecheck, lint, test, and build |
| `npm run test:ci` | Typecheck, lint, test, and build without reinstalling |

## Verification Status

Verified in this workspace on April 9, 2026:

- `npm run typecheck` passed
- `npm run lint` passed
- `npm run test` passed

The current test suite focuses on middleware, auth provisioning, upload initiation, file operation permissions, and secure download authorization. The repo does not currently include a browser-driven E2E runner in `package.json`; the `test:e2e` target is a Jest test.

## Known Constraints

- The storage usage chart is based on a fixed 2 GB cap, not a live Appwrite quota.
- Search is implemented through a debounced client component that calls the server action directly and returns up to 8 results.
- Shared access works best when every shared email belongs to a user that has already been provisioned into the Appwrite `users` collection.
- If you rely on the bucket created by the setup script, review its allowed file extensions before production use.

## Troubleshooting

### Auth routes do not render correctly

- Confirm the public routes remain `/sign-in/[[...rest]]` and `/sign-up/[[...rest]]`.
- Confirm `middleware.ts` keeps `/sign-in(.*)` and `/sign-up(.*)` public.

### Upload initiation returns unauthorized

- Confirm the user is signed in with Clerk.
- Confirm `getCurrentUser()` can create or resolve the Appwrite `users` document.
- Confirm your Appwrite API key and collection IDs are valid.

### Downloads return 403

- Confirm the file belongs to the current user or has an active share record.
- Confirm the `file_shares` collection ID is set if you want indexed share lookups.
- Confirm the Appwrite Storage permissions still include the intended users.

### Setup script fails immediately

- Confirm `.env.local` exists.
- Confirm `NEXT_PUBLIC_APPWRITE_DATABASE` points to an existing database.
- Confirm your Appwrite project ID and API key are valid.
