# {{APP_NAME}} — Project Initialization

{{APP_DESCRIPTION}}

Modern web application built with Next.js 16 (App Router), React 19, Supabase, and Tailwind CSS 4.

## Tech Stack

### Core
- **Node v24.21.0**
- **Next.js 16.4.0** (App Router) — routing & server components
- **React 19.3.0** — functional components only
- **TypeScript 5.9** — mandatory for all new code

### UI
- **Tailwind CSS 4** — utility-first CSS framework
- **PostCSS** — CSS processing

### Backend/Database
- **Supabase** — authentication, database, and real-time features
  - Authentication (email/password, OAuth, magic links)
  - PostgreSQL database with Row Level Security (RLS)
  - Real-time subscriptions
  - Storage for file uploads
  - Edge Functions for server-side logic

## Project Initialization

### Prerequisites

- **Node.js 24.21.0** installed on your system
- **npm** or **pnpm** as package manager
- [Supabase](https://supabase.com) account

### 1. Create Next.js Project

```bash
# Create project with Next.js
npx create-next-app@16.4.0 {{APP_SLUG}}

# Recommended options during installation:
# ✅ TypeScript: Yes
# ✅ ESLint: Yes
# ✅ Tailwind CSS: Yes
# ✅ src/ directory: Yes (RECOMMENDED for hexagonal architecture)
# ✅ App Router: Yes
# ✅ Turbopack: Yes (optional)
# ✅ React Compiler: Yes
# ✅ import alias: keep the default "@/*" (resolves to ./src/*)

cd {{APP_SLUG}}
```

### 2. Install Additional Dependencies

```bash
# Install Supabase client
npm install @supabase/supabase-js @supabase/ssr

# Install development dependencies
npm install -D supabase babel-plugin-react-compiler @types/node@24 @types/react @types/react-dom

# Initialize the local Supabase project (creates supabase/config.toml and supabase/migrations/)
npx supabase init
```

### 3. Configure Tailwind CSS 4

Update the `tailwind.config.ts` file:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};

export default config;
```


### 4. Configure TypeScript

Verify that `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 5. Enable the React Compiler

`next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default nextConfig;
```

### 6. Environment Variables

Create `.env.example` (committed) and `.env.local` (never committed):

```env
# Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Server-only — NEVER prefix with NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Trusted application origin used to build Auth email links
APP_URL=http://localhost:3000
```

Make sure `.gitignore` contains `.env*` and `!.env.example`.

### 7. Supabase clients, middleware and auth

Follow [Supabase Setup](04-supabase-setup.md).

## Development Commands

```bash
# Development with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Linting
npm run lint

# Type check
npx tsc --noEmit

# Local Supabase stack / apply migrations locally
npx supabase start
npx supabase migration up

# Verify Node version
node -v  # Should display v24.21.0
```

