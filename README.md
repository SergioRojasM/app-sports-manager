# 🚀 Next.js 16 Boilerplate with Supabase Auth

Production-ready Next.js boilerplate with authentication, TypeScript, Tailwind CSS, and Supabase integration.

## ✨ Features

- **Next.js 16** - App Router, React 19, Server Components
- **TypeScript** - Full type safety
- **Tailwind CSS v4** - Modern utility-first styling
- **Supabase** - Authentication & Backend as a Service
- **Authentication** - Email/Password login & signup with protected routes
- **Hexagonal Architecture** - Clean, maintainable code structure
- **ESLint** - Code quality & linting
- **React Compiler** - Performance optimization

## 📦 What's Included

### Authentication System
- ✅ Email/Password Sign In
- ✅ Email/Password Sign Up
- ✅ Email confirmation flow
- ✅ Auth callback handler
- ✅ Protected routes with middleware
- ✅ Custom `useAuth` hook
- ✅ Server & client-side auth utilities

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication pages
│   │   ├── login/         # Login page
│   │   └── callback/      # Auth callback handler
│   └── dashboard/         # Protected dashboard
├── components/            # React components
│   ├── auth/             # Auth-related components
│   └── common/           # Shared components
├── hooks/                # Custom React hooks
│   └── auth/            # useAuth hook
├── services/            # Infrastructure layer
│   └── supabase/       # Supabase clients & utilities
└── types/              # TypeScript definitions
```

## 🎯 Quick Start

### 1. Use This Template

**Option A: Clone the repository**
```bash
git clone <your-repo-url> my-project
cd my-project
rm -rf .git
git init
```

**Option B: Use GitHub Template**
Click "Use this template" button on GitHub

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Supabase

#### Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Wait for the database to be ready

#### Get Credentials

1. Go to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Set Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Configure Email Authentication

In Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional)
4. Set **Site URL** to `http://localhost:3000` (development)
5. Add redirect URL: `http://localhost:3000/auth/callback`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication Usage

### Login Page

Navigate to `/auth/login` to access the authentication page which includes:
- Redesigned responsive two-panel layout (benefits panel + login card)
- Email/password sign in form with loading and error feedback
- Visual links for forgot password and sign up routes
- Redirect behavior using `next` query param fallback to `/dashboard`

Design reference: `projectspec/designs/login.html`

### Sign In Flow

1. User enters email and password
2. Click "Sign In"
3. Authenticated immediately
4. Redirected to `next` path when provided, otherwise `/dashboard`

### Protected Routes

All routes under `/dashboard` are automatically protected by middleware. Unauthenticated users are redirected to `/auth/login`.

### Using useAuth Hook

```typescript
'use client'
import { useAuth } from '@/hooks/auth/useAuth'

export function MyComponent() {
  const { user, signIn, signUp, signOut, loading, errorMessage } = useAuth()

  // Sign in
  await signIn({ email: 'user@example.com', password: 'password' })
  
  // Sign up
  await signUp({ email: 'user@example.com', password: 'password' })
  
  // Sign out
  await signOut()
}
```

### Server-Side Auth

```typescript
import { createServerClient } from '@/services/supabase/server'

export default async function ProtectedPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  return <div>Welcome {user?.email}</div>
}
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Adding New Features

1. **New Page**: Create in `src/app/`
2. **New Component**: Create in `src/components/`
3. **New Hook**: Create in `src/hooks/`
4. **New Service**: Create in `src/services/`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ Yes |

## 📚 Documentation

Detailed documentation is available in the `projectspec/` folder:

- [Project Tech Stack](projectspec/01-project-tech-stack.md)
- [Project Initialization](projectspec/02-project-init.md)
- [Project Structure](projectspec/03-project-structure.md)
- [Supabase Setup](projectspec/04-supabase-setup.md)

## 🔒 Security

- **Environment Variables**: Never commit `.env.local` to version control
- **Supabase Keys**: Only use the `anon` public key (exposed to frontend)
- **RLS Policies**: Configure Row Level Security in Supabase for data protection
- **Middleware**: Routes are protected server-side via middleware

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

Update Supabase redirect URLs:
- Add production URL to **Site URL**
- Add `https://your-domain.com/auth/callback` to allowed redirect URLs

### Other Platforms

Works with any platform supporting Next.js 16:
- Netlify
- AWS Amplify
- Railway
- Fly.io

## 🤝 Contributing

Feel free to customize this boilerplate for your needs!

## 📄 License

MIT License - feel free to use this template for any project.

## 🆘 Troubleshooting

### "Invalid login credentials"
- Verify email is confirmed in Supabase Dashboard → Authentication → Users
- Check password meets minimum requirements

### "Auth callback error"
- Verify `/auth/callback` route exists
- Check redirect URL configured in Supabase

### Environment variables not working
- Restart dev server after changing `.env.local`
- Variables must start with `NEXT_PUBLIC_` for client-side access

### Module resolution errors
- Delete `node_modules` and `.next`
- Run `npm install` again
- Restart dev server
