"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// AudienceOS Logo with Poppins font (thick "audience", thin "OS" with gradient)
function AudienceOSLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-0 ${className}`} style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
      <span className="text-3xl font-semibold tracking-tight text-white">audience</span>
      <span
        className="text-3xl font-light tracking-tight"
        style={{
          background: "linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #06b6d4 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        OS
      </span>
    </div>
  )
}

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Handle OAuth errors from callback redirect
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    const errorDescription = searchParams.get('error_description')

    if (errorParam) {
      // Map error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        'no_code': 'Authentication failed. Please try again.',
        'auth_callback_error': messageParam || 'Authentication failed. Please try again.',
        'unexpected_error': 'An unexpected error occurred. Please try again.',
        'access_denied': 'Access was denied. Please try again.',
      }

      setError(errorMessages[errorParam] || errorDescription || messageParam || 'Authentication failed')
    }
  }, [searchParams])

  // Handle Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      const redirectTo = searchParams.get('redirect') || '/'
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        setError(error.message)
        setGoogleLoading(false)
      }
      // If no error, browser will redirect to Google
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
      setGoogleLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      router.push("/")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="space-y-1 text-center">
          <AudienceOSLogo />
          <p className="text-sm text-slate-400">Sign in to Command Center</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              id="email"
              data-testid="login-email"
              type="email"
              placeholder="you@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              data-testid="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>

          {error && (
            <div data-testid="login-error" className="text-sm text-red-400 bg-red-950/50 border border-red-900 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" data-testid="login-submit" className="w-full bg-white text-slate-900 hover:bg-slate-100" disabled={loading || googleLoading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-950 px-2 text-slate-500">Or continue with</span>
          </div>
        </div>

        {/* Google Sign-in Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {googleLoading ? "Redirecting to Google..." : "Sign in with Google"}
        </Button>

        {/* Create Account Link */}
        <p className="text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-white hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}

// Wrapper component to handle Suspense boundary for useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-full max-w-sm space-y-6 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
