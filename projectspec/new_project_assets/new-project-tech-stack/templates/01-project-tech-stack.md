## Technology Stack

### Core
- **Node v24.21.0** (LTS)
- **Next.js 16.4.0 (App Router)** — routing & server components
- **React 19.3.0** — functional components only
- **TypeScript 5.9** — mandatory for all new code, `strict` mode (stay on 5.x until Next.js and `eslint-config-next` support 7)
- **React Compiler** (`babel-plugin-react-compiler`) — automatic memoization

### UI
- **Tailwind CSS 4** — utility-first CSS framework
- **PostCSS** (`@tailwindcss/postcss`) — CSS processing

### Backend/Database
- **Supabase** — authentication, database, and real-time features
  - Authentication (email/password, OAuth, magic links)
  - PostgreSQL database with Row Level Security (RLS)
  - Real-time subscriptions
  - Storage for file uploads
  - Edge Functions for server-side logic
- **@supabase/supabase-js 2** + **@supabase/ssr** — browser, server and middleware clients
- **Supabase CLI** (dev dependency) — local stack and SQL migrations in `supabase/migrations/`

### Tooling
- **ESLint 9** (stay on 9.x until `eslint-config-next` supports 10) with `eslint-config-next` (core-web-vitals + typescript)
- **npm** — package manager
- **OpenSpec** — spec-driven change workflow (`openspec/`)

### Hosting
- **Vercel** — application
- **Supabase Cloud** — database, auth and storage

### Optional libraries (add only when a feature needs them)

| Need | Library |
|------|---------|
| Transactional email | `resend` |
| Charts / dashboards | `@nivo/bar`, `@nivo/line`, `@nivo/pie` |
| Excel export | `exceljs` |
| PDF generation | `jspdf` |
| QR codes | `qrcode`, `qr-scanner` |
| Markdown rendering | `react-markdown` |
| Web analytics | `@vercel/analytics` |
