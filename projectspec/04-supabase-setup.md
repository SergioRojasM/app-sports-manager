# Supabase Setup

Complete guide for configuring Supabase in your Next.js 16 project with App Router.

> **Related Documentation**: See [Project Initialization](02-project-init.md), [Project Structure](03-project-structure.md), and [Tech Stack](01-project-tech-stack.md)

## � Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Installation](#-installation)
3. [Configuration](#️-configuration)
   - Environment Variables
   - Supabase Clients (Browser & Server)
   - Middleware Setup
4. [Authentication](#-authentication)
   - Email/Password Sign Up & Sign In
   - OAuth Providers (Google, GitHub)
   - Auth Callback Handler
5. [Complete Authentication Pages](#-complete-authentication-pages)
   - Login Page
   - Sign Up Page
   - Auth Error Page
   - useAuth Hook
6. [Protected Routes](#️-protected-routes)
   - Middleware with Route Protection
   - Server-Side Protection
   - API Route Protection
   - Route Structure
7. [Database Operations](#-database-operations)
   - Query, Insert, Update, Delete
8. [Real-time Subscriptions](#-real-time-subscriptions)
9. [Storage (File Upload)](#-storage-file-upload)
10. [Row Level Security (RLS)](#-row-level-security-rls)
11. [Security Best Practices](#-security-best-practices)
12. [Project Structure Integration](#-project-structure-integration)
13. [Troubleshooting](#-troubleshooting)
14. [Resources](#-resources)

## �📋 Prerequisites

- Next.js 16 project configured (see [Project Initialization](02-project-init.md))
- [Supabase](https://supabase.com) account
- Node.js 22.20.0

## 🚀 Installation

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

> **Note**: This is included in the [Project Initialization](02-project-init.md) guide.

## ⚙️ Configuration

### 2. Environment Variables

Create `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Get Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Settings → API
4. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> ⚠️ **Important**: Ensure `.env.local` is in your `.gitignore`

### 3. Create Supabase Clients

> **Architecture Note**: Following [hexagonal architecture](03-project-structure.md), Supabase clients are located in the **Infrastructure layer** (`src/services/supabase/`).

#### 3.1 Browser Client

Create `src/services/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Usage in Client Components:**

```typescript
'use client'

import { createClient } from '@/services/supabase/client'
import { useEffect, useState } from 'react'

export default function ClientComponent() {
  const [user, setUser] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  return <div>User: {user?.email}</div>
}
```

#### 3.2 Server Client

Create `src/services/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

**Usage in Server Components:**

```typescript
import { createClient } from '@/services/supabase/server'

export default async function ServerComponent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <div>User: {user?.email}</div>
}
```

**Usage in Route Handlers (API Routes):**

```typescript
import { createClient } from '@/services/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return NextResponse.json({ user })
}
```

**Usage in Server Actions:**

```typescript
'use server'

import { createClient } from '@/services/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createEvent(formData: FormData) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('events')
    .insert({
      name: formData.get('name'),
      date: formData.get('date'),
    })
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/events')
  return { data }
}
```

### 4. Configure Middleware

#### 4.1 Create Middleware Utility

Create `src/services/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => 
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Optional: Redirect logic based on auth state
  // if (!user && !request.nextUrl.pathname.startsWith('/login')) {
  //   const url = request.nextUrl.clone()
  //   url.pathname = '/login'
  //   return NextResponse.redirect(url)
  // }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so: NextResponse.next({ request })
  // 2. Copy over the cookies, like so: supabaseResponse.cookies.getAll().forEach(...)
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!

  return supabaseResponse
}
```

#### 4.2 Configure Main Middleware

Create/update `middleware.ts` in the project root:

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from './src/services/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## 🔐 Authentication

> **Architecture Note**: Authentication components should follow the [component structure](03-project-structure.md): place in `src/components/auth/` and use hooks from `src/hooks/auth/`.

### Sign Up with Email

```typescript
'use client'

import { createClient } from '@/services/supabase/client'
import { useState } from 'react'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('Error signing up:', error.message)
    } else {
      console.log('Check your email for confirmation!')
    }
  }

  return (
    <form onSubmit={handleSignUp}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Sign Up</button>
    </form>
  )
}
```

### Sign In with Email

```typescript
'use client'

import { createClient } from '@/services/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Error signing in:', error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSignIn}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Sign In</button>
    </form>
  )
}
```

### Sign Out

```typescript
'use client'

import { createClient } from '@/services/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return <button onClick={handleSignOut}>Sign Out</button>
}
```

### OAuth (Google, GitHub, etc.)

```typescript
'use client'

import { createClient } from '@/services/supabase/client'

export default function OAuthButtons() {
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  const handleGitHubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div>
      <button onClick={handleGoogleLogin}>Sign in with Google</button>
      <button onClick={handleGitHubLogin}>Sign in with GitHub</button>
    </div>
  )
}
```

### Auth Callback Route

Create `app/auth/callback/route.ts`:

```typescript
import { createClient } from '@/services/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

## � Complete Authentication Pages

### Login Page

Create `src/app/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/services/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleEmailLogin}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/reset-password" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOAuth('google')}
              disabled={loading}
            >
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOAuth('github')}
              disabled={loading}
            >
              GitHub
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

### Sign Up Page

Create `src/app/signup/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/services/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import Link from 'next/link'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      // Optionally redirect after showing success message
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="rounded-md bg-green-50 p-4">
            <h3 className="text-lg font-medium text-green-800">Check your email!</h3>
            <p className="mt-2 text-sm text-green-700">
              We've sent you a confirmation email. Please click the link in the email to verify your account.
            </p>
          </div>
          <div className="mt-4 text-center">
            <Link href="/login" className="text-blue-600 hover:text-blue-500">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />

            <p className="text-xs text-gray-500">
              Password must be at least 6 characters long
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

### Auth Error Page

Create `src/app/auth/auth-code-error/page.tsx`:

```typescript
import Link from 'next/link'
import { Button } from '@/components/common/Button'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="rounded-md bg-red-50 p-8">
          <svg
            className="mx-auto h-12 w-12 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-red-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-red-700">
            There was a problem signing you in. The authentication code may have expired or is invalid.
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/login" className="block">
            <Button className="w-full">
              Try Again
            </Button>
          </Link>
          <Link href="/" className="block text-sm text-gray-600 hover:text-gray-900">
            Go back home
          </Link>
        </div>

        <div className="mt-8 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900">Common solutions:</h3>
          <ul className="mt-2 text-sm text-gray-600 space-y-1 text-left">
            <li>• Try signing in again from the login page</li>
            <li>• Make sure you're using the latest link from your email</li>
            <li>• Clear your browser cookies and try again</li>
            <li>• Contact support if the problem persists</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
```

### Auth Hook for Components

Create `src/hooks/common/useAuth.ts`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/services/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return { user, loading, signOut }
}
```

## 🛡️ Protected Routes

### Middleware with Route Protection

Update `middleware.ts` to protect specific routes:

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './src/services/supabase/middleware'

// Define protected routes
const protectedRoutes = ['/dashboard', '/profile', '/settings']
const authRoutes = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  // Update session (refresh token if needed)
  const response = await updateSession(request)
  
  const path = request.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
  const isAuthRoute = authRoutes.some(route => path.startsWith(route))

  // Get user from response
  const supabaseResponse = response
  const cookies = supabaseResponse.cookies.getAll()
  const hasSession = cookies.some(cookie => cookie.name.includes('auth-token'))

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !hasSession) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', path)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if accessing auth routes with active session
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Alternative: Server-Side Route Protection

For more robust protection, check authentication in page files:

```typescript
// src/app/dashboard/page.tsx
import { createClient } from '@/services/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.email}</p>
    </div>
  )
}
```

### Route Protection Helper

Create `src/lib/auth.ts` for reusable auth checks:

```typescript
import { createClient } from '@/services/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

Usage in pages:

```typescript
// src/app/profile/page.tsx
import { requireAuth } from '@/lib/auth'

export default async function ProfilePage() {
  const user = await requireAuth()

  return (
    <div>
      <h1>Profile</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

## 📋 Route Structure

### Recommended Route Organization

```
Public Routes (no authentication required):
├── /                           # Landing page
├── /about                      # About page
├── /login                      # Login page
├── /signup                     # Sign up page
├── /reset-password             # Password reset
├── /auth/callback              # OAuth callback
└── /auth/auth-code-error       # Auth error page

Protected Routes (authentication required):
├── /dashboard                  # Main dashboard
├── /profile                    # User profile
├── /settings                   # User settings
├── /api/*                      # API routes
└── /admin/*                    # Admin routes

Mixed Routes (optional auth):
├── /blog                       # Public blog
└── /docs                       # Public documentation
```

### API Route Protection

```typescript
// src/app/api/events/route.ts
import { createClient } from '@/services/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data })
}
```

## �💾 Database Operations

> **Architecture Note**: Database operations should be in **services** (`src/services/`), called from **hooks** (`src/hooks/`), never directly from components. See [Architecture Rules](03-project-structure.md#architecture-rules).

### Query Data

```typescript
import { createClient } from '@/services/supabase/server'

export async function getEvents() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching events:', error)
    return []
  }

  return data
}
```

### Insert Data

```typescript
import { createClient } from '@/services/supabase/server'

export async function createEvent(eventData: any) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('events')
    .insert(eventData)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
```

### Update Data

```typescript
import { createClient } from '@/services/supabase/server'

export async function updateEvent(id: string, updates: any) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
```

### Delete Data

```typescript
import { createClient } from '@/services/supabase/server'

export async function deleteEvent(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}
```

## 🔄 Real-time Subscriptions

> **Best Practice**: Real-time subscriptions should be managed in custom hooks (`src/hooks/`) and consumed by client components.

```typescript
'use client'

import { createClient } from '@/services/supabase/client'
import { useEffect, useState } from 'react'

export default function RealtimeEvents() {
  const [events, setEvents] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Fetch initial data
    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('*')
      if (data) setEvents(data)
    }
    fetchEvents()

    // Subscribe to changes
    const channel = supabase
      .channel('events-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          console.log('Change received!', payload)
          
          if (payload.eventType === 'INSERT') {
            setEvents((prev) => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setEvents((prev) =>
              prev.map((event) =>
                event.id === payload.new.id ? payload.new : event
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setEvents((prev) =>
              prev.filter((event) => event.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <div>
      {events.map((event) => (
        <div key={event.id}>{event.name}</div>
      ))}
    </div>
  )
}
```

## 📦 Storage (File Upload)

```typescript
'use client'

import { createClient } from '@/services/supabase/client'
import { useState } from 'react'

export default function FileUpload() {
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      console.log('File uploaded:', data.publicUrl)
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={uploadFile}
        disabled={uploading}
      />
    </div>
  )
}
```

## 🔒 Row Level Security (RLS)

> **Security Best Practice**: Always enable RLS on all tables and create specific policies for each use case.

Example RLS policies in Supabase:

```sql
-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow public read of events
CREATE POLICY "Public events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

-- Only authenticated users can create events
CREATE POLICY "Authenticated users can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only creator can update their events
CREATE POLICY "Users can update their own events"
  ON events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only creator can delete their events
CREATE POLICY "Users can delete their own events"
  ON events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

## � Project Structure Integration

### Recommended Service Structure

Follow the [project structure](03-project-structure.md) for organizing Supabase code:

```
src/
├── services/
│   ├── supabase/
│   │   ├── client.ts       # Browser client
│   │   ├── server.ts       # Server client
│   │   ├── middleware.ts   # Auth middleware
│   │   └── auth.ts         # Auth helpers (optional)
│   ├── eventsService.ts    # Example: Events CRUD
│   └── uploadService.ts    # Example: File uploads
│
├── hooks/
│   ├── auth/
│   │   └── useAuth.ts      # Auth state management
│   └── events/
│       └── useEvents.ts    # Events data fetching
│
└── components/
    └── auth/
        ├── SignInForm.tsx
        ├── SignUpForm.tsx
        └── AuthButton.tsx
```

### Example Service Pattern

```typescript
// src/services/eventsService.ts
import { createClient } from '@/services/supabase/server'
import { Event } from '@/types/events.types'

export const eventsService = {
  async getAll(): Promise<Event[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })

    if (error) throw error
    return data
  },

  async create(event: Omit<Event, 'id'>): Promise<Event> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
```

## � Security Best Practices

### Authentication Flow Security

**1. Email Confirmation**
```typescript
// Always require email confirmation in production
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
})
```

In Supabase Dashboard:
- Authentication → Settings → Email Auth
- Enable "Confirm email" for production

**2. Password Requirements**
```typescript
// Enforce strong passwords
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain an uppercase letter' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain a lowercase letter' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain a number' }
  }
  return { valid: true }
}
```

**3. Rate Limiting**

Configure in Supabase Dashboard:
- Authentication → Settings → Security → Rate Limiting
- Set appropriate limits for sign-in attempts
- Consider implementing client-side throttling

**4. Session Security**

```typescript
// Always refresh sessions in middleware
export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  // Session is automatically refreshed if needed
  return response
}
```

**5. Protected API Routes**

```typescript
// src/app/api/protected/route.ts
import { createClient } from '@/services/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // Always verify user exists
  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Proceed with protected logic
  // ...
}
```

### Row Level Security (RLS) Examples

**User-owned Resources:**
```sql
-- Users can only read their own data
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can only update their own data
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

**Shared Resources:**
```sql
-- Everyone can read public posts
CREATE POLICY "Public posts are viewable"
  ON posts FOR SELECT
  USING (is_public = true);

-- Only authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

**Role-based Access:**
```sql
-- Only admins can delete any post
CREATE POLICY "Admins can delete posts"
  ON posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### Environment Variables Security

**1. Never commit sensitive data:**
```bash
# .gitignore (should already be there)
.env.local
.env*.local
```

**2. Use environment-specific files:**
```
.env.local           # Local development (not committed)
.env.example         # Template for required variables (committed)
.env.production      # Production variables (managed in hosting platform)
```

**3. Validate environment variables:**
```typescript
// src/lib/env.ts
function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]

  for (const envVar of required) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
  }
}

// Call at app startup
validateEnv()
```

### OAuth Configuration

**1. Configure OAuth Providers in Supabase:**
- Dashboard → Authentication → Providers
- Enable desired providers (Google, GitHub, etc.)
- Add OAuth credentials from provider
- Configure redirect URLs

**2. Add Redirect URLs:**
```
Development:
http://localhost:3000/auth/callback

Production:
https://yourdomain.com/auth/callback
```

**3. Site URL Configuration:**
- Set in Supabase Dashboard → Authentication → URL Configuration
- Add all domains where your app is hosted

### Common Security Mistakes to Avoid

❌ **Don't do this:**
```typescript
// Never trust client-side checks alone
if (user.email === 'admin@example.com') {
  // Show admin features
}
```

✅ **Do this instead:**
```typescript
// Always verify on server-side with RLS
const { data } = await supabase
  .from('admin_data')
  .select('*')
// RLS policy will ensure only admins can access
```

❌ **Don't do this:**
```typescript
// Never expose service role key in client code
const supabase = createClient(url, SERVICE_ROLE_KEY) // ❌ WRONG!
```

✅ **Do this instead:**
```typescript
// Always use anon key in client, let RLS handle permissions
const supabase = createClient(url, ANON_KEY) // ✅ CORRECT
```

## 📚 Resources

### Official Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase with Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

### Project Documentation
- [Project Initialization](02-project-init.md) - Setup instructions
- [Project Structure](03-project-structure.md) - Architecture and organization
- [Tech Stack](01-project-tech-stack.md) - Technology overview

### Security Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)

## 🐛 Troubleshooting

### Error: "supabaseUrl is required"

Verify that environment variables are correctly configured in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Solution**: Check that `.env.local` exists in project root and contains both variables.

### Session doesn't persist

Ensure middleware is correctly configured and the `matcher` includes all necessary routes.

**Solution**: 
1. Verify `middleware.ts` exists in project root
2. Check that `updateSession` is properly imported from `src/services/supabase/middleware.ts`
3. Ensure matcher pattern includes your routes

### CORS Errors

Verify in Supabase Dashboard → Authentication → URL Configuration that your local URL (`http://localhost:3000`) is in the allowed Site URLs list.

**Solution**: Add your development and production URLs to Site URLs in Supabase Dashboard.

### Import path errors

If you see import errors for `@/services/supabase/*`, verify your `tsconfig.json` has the correct path alias:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### "Cannot read cookies" error in Server Components

This occurs when trying to use the browser client in Server Components.

**Solution**: Use `import { createClient } from '@/services/supabase/server'` in Server Components, not the browser client.

## ✅ Quick Start Checklist

### Initial Setup
- [ ] Install Supabase packages: `npm install @supabase/supabase-js @supabase/ssr`
- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Copy `.env.example` to `.env.local`
- [ ] Add Supabase credentials to `.env.local`

### Core Files
- [ ] Create `src/services/supabase/client.ts`
- [ ] Create `src/services/supabase/server.ts`
- [ ] Create `src/services/supabase/middleware.ts`
- [ ] Create/update `middleware.ts` in project root

### Authentication Pages
- [ ] Create `src/app/login/page.tsx`
- [ ] Create `src/app/signup/page.tsx`
- [ ] Create `src/app/auth/callback/route.ts`
- [ ] Create `src/app/auth/auth-code-error/page.tsx`
- [ ] Create `src/hooks/common/useAuth.ts`

### Security Configuration
- [ ] Enable RLS on all database tables
- [ ] Create appropriate RLS policies
- [ ] Configure OAuth providers (if using)
- [ ] Add redirect URLs in Supabase Dashboard
- [ ] Set up site URLs in Supabase Dashboard

### Route Protection
- [ ] Update middleware with protected routes
- [ ] Create auth helper functions (`src/lib/auth.ts`)
- [ ] Protect API routes
- [ ] Test authentication flow

### Testing
- [ ] Test sign up flow
- [ ] Test sign in flow
- [ ] Test OAuth flow (if configured)
- [ ] Test protected routes redirect to login
- [ ] Test sign out clears session
- [ ] Test session persistence after page refresh

## 🎯 Next Steps After Setup

1. **Generate Database Types:**
   ```bash
   npx supabase gen types typescript --project-id your-project-id > src/types/database.types.ts
   ```

2. **Create Your First Feature:**
   - Follow the [project structure guide](03-project-structure.md)
   - Create service in `src/services/`
   - Create hook in `src/hooks/`
   - Create components in `src/components/`

3. **Set up Database:**
   - Design your schema in Supabase Dashboard
   - Enable RLS on all tables
   - Create appropriate policies
   - Generate TypeScript types

4. **Deploy:**
   - Set environment variables in hosting platform
   - Add production URL to Supabase allowed sites
   - Test authentication in production

---

**Last Updated**: February 2026 | **Next.js Version**: 16.1.6 | **Supabase SSR**: Latest
