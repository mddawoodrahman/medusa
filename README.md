# 🐍 Medusa

A modern storage management and file sharing platform.

Medusa is a sleek and powerful platform that lets users seamlessly upload, organize, and share files. Built with the latest Next.js 15, React 19, and the Appwrite Node SDK, Medusa offers a lightning-fast and intuitive experience for managing files with ease and security.

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [Appwrite Setup](#-appwrite-setup)
- [Scripts](#-scripts)
- [Dependencies](#-dependencies)

## ⚙️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.0.0-rc | Frontend UI Library |
| Next.js | 15.3.2 | React Framework with App Router |
| Appwrite | 17.0.2 (Client) / 14.2.0 (Node) | Backend as a Service |
| TailwindCSS | 3.4.1 | Utility-first CSS Framework |
| ShadCN UI | - | Accessible UI Components |
| TypeScript | 5.x | Type Safety |
| Zod | 3.23.8 | Schema Validation |
| React Hook Form | 7.53.1 | Form Management |

## 🔋 Features

### 👉 Appwrite Authentication
Secure and reliable signup, login, and logout flows powered by Appwrite with OTP verification.

### 👉 File Uploads
Upload images, videos, documents, audio files, and more—effortlessly with drag-and-drop support.

### 👉 Complete File Management
View, open in a new tab, rename, and delete files—all stored safely in Appwrite.

### 👉 One-Click Downloads
Access your uploaded files offline with quick and easy downloads.

### 👉 File Sharing
Generate shareable links to collaborate or share files with anyone.

### 👉 Interactive Dashboard
Stay informed with a dashboard that shows storage usage, recent uploads, and file statistics by type.

### 👉 Global Search
Quickly find any file or shared content using a powerful, platform-wide search with debounced input.

### 👉 Flexible Sorting
Sort files by name, date, or size to organize content your way.

### 👉 Modern Responsive Design
Minimal, beautiful, and fully responsive UI built with TailwindCSS and ShadCN for a smooth experience across devices.

## 📁 Project Structure

```
medusa-main/
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/            # Authentication routes (sign-in, sign-up)
│   ├── (root)/            # Protected main application routes
│   ├── fonts/             # Custom font files
│   ├── globals.css        # Global styles and Tailwind directives
│   └── layout.tsx         # Root layout with metadata
├── components/            # React components
│   └── ui/               # ShadCN UI components
├── constants/            # Application constants and configuration
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and server actions
│   ├── actions/          # Server actions for files and users
│   └── appwrite/         # Appwrite client configuration
├── public/               # Static assets
│   └── assets/          # Icons and images
└── types/               # TypeScript type definitions
```

## 📋 Prerequisites

- **Node.js** 18.x or later
- **npm**, **yarn**, or **pnpm** package manager
- **Appwrite** instance (Cloud or Self-hosted)
- Modern web browser with JavaScript enabled

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/medusa.git
   cd medusa
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables** (see [Environment Variables](#-environment-variables))

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=your_project_id
NEXT_PUBLIC_APPWRITE_DATABASE=your_database_id
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION=your_users_collection_id
NEXT_PUBLIC_APPWRITE_FILES_COLLECTION=your_files_collection_id
NEXT_PUBLIC_APPWRITE_BUCKET=your_bucket_id
NEXT_APPWRITE_KEY=your_appwrite_api_key
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Your Appwrite API endpoint |
| `NEXT_PUBLIC_APPWRITE_PROJECT` | Appwrite project ID |
| `NEXT_PUBLIC_APPWRITE_DATABASE` | Appwrite database ID |
| `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION` | Users collection ID |
| `NEXT_PUBLIC_APPWRITE_FILES_COLLECTION` | Files collection ID |
| `NEXT_PUBLIC_APPWRITE_BUCKET` | Storage bucket ID |
| `NEXT_APPWRITE_KEY` | Server-side API key (keep secret!) |

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```
Runs with Next.js Turbopack for faster development builds.

### Production Build
```bash
npm run build
npm run start
```

### Linting
```bash
npm run lint
```

## 🗄️ Appwrite Setup

### Required Collections

#### Users Collection
| Attribute | Type | Required |
|-----------|------|----------|
| `fullName` | String | Yes |
| `email` | Email | Yes |
| `avatar` | URL | Yes |
| `accountId` | String | Yes |

#### Files Collection
| Attribute | Type | Required |
|-----------|------|----------|
| `name` | String | Yes |
| `type` | String | Yes |
| `extension` | String | Yes |
| `url` | URL | Yes |
| `size` | Integer | Yes |
| `owner` | String | Yes |
| `accountId` | String | Yes |
| `bucketField` | String | Yes |
| `users` | String[] | No |

### Storage Bucket
Create a storage bucket with the following settings:
- **Maximum file size**: 50MB
- **Allowed file extensions**: Configure based on your needs
- **Enable file security**: Yes

## 📜 Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev --turbopack` | Start development server with Turbopack |
| `build` | `next build` | Create production build |
| `start` | `next start` | Start production server |
| `lint` | `next lint` | Run ESLint |

## 📦 Dependencies

### Production Dependencies
- **@hookform/resolvers** - Zod resolver for React Hook Form
- **@radix-ui/*** - Accessible UI primitives (dialog, dropdown, etc.)
- **appwrite** - Appwrite client SDK
- **node-appwrite** - Appwrite server SDK
- **react-dropzone** - Drag-and-drop file uploads
- **recharts** - Chart components for dashboard
- **use-debounce** - Debounce hook for search
- **zod** - Schema validation

### Dev Dependencies
- **typescript** - Type checking
- **tailwindcss** - CSS framework
- **eslint** - Code linting
- **prettier** - Code formatting

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

Medusa leverages cutting-edge tools and clean architecture to ensure scalability, reusability, and performance—ideal for both personal and collaborative use cases.
