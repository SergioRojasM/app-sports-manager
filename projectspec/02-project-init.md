# Next.js + React + Supabase + Tailwind CSS

Modern web application built with Next.js 16 (App Router), React 19, Supabase, and Tailwind CSS 4.

## Tech Stack

### Core
- **Node v22.20.0**
- **Next.js 16.1.6** (App Router) — routing & server components
- **React 19.2.3** — functional components only
- **TypeScript 5** — mandatory for all new code

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

- **Node.js 22.20.0** installed on your system
- **npm** or **pnpm** as package manager
- [Supabase](https://supabase.com) account

### 1. Create Next.js Project

```bash
# Create project with Next.js
npx create-next-app@16.1.6 project-name

# Recommended options during installation:
# ✅ TypeScript: Yes
# ✅ ESLint: Yes
# ✅ Tailwind CSS: Yes
# ✅ src/ directory: Yes (RECOMMENDED for hexagonal architecture)
# ✅ App Router: Yes
# ✅ Turbopack: Yes (optional)
# ❌ import alias: No (or customize as preferred)

cd project-name
```

### 2. Install Additional Dependencies

```bash
# Install Supabase client
npm install @supabase/supabase-js @supabase/ssr

# Install development dependencies (optional)
npm install -D @types/node @types/react @types/react-dom
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
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

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

# Verify Node version
node -v  # Should display v22.20.0
```

