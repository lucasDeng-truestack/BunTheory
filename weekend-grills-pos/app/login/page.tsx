'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Flame, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, hydrated, hydrate } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      toast.error('Session expired — please sign in again.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (hydrated && isAuthenticated) router.replace('/dashboard');
  }, [hydrated, isAuthenticated, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      login(res.accessToken, res.admin);
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bbq-charcoal">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgb(249_115_22/0.22),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,rgb(154_52_18/0.12),transparent_50%)]"
        aria-hidden
      />
      <div className="relative w-full max-w-sm space-y-8 px-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-bbq-flame to-bbq-coals shadow-[0_0_28px_rgb(249_115_22/0.45)] ring-1 ring-bbq-flame/40">
            <Flame className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-black text-white tracking-wide">
              The Weekend Grills
            </h1>
            <p className="text-stone-500 text-sm font-display mt-1">
              Backyard fire · Point of Sale
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-display font-semibold text-stone-400 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg bg-stone-800/80 border border-stone-700/60 px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-bbq-flame focus:border-transparent transition"
              placeholder="admin@weekendgrills.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-display font-semibold text-stone-400 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg bg-stone-800/80 border border-stone-700/60 px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-bbq-flame focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-6 text-sm font-display font-bold bg-bbq-flame hover:bg-bbq-flame/90 text-white shadow-lg shadow-bbq-flame/20"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        <p className="text-center text-[11px] text-stone-500 font-display">
          Charcoal · Ember · Smoke
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bbq-charcoal">
          <Loader2 className="h-8 w-8 animate-spin text-bbq-flame" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
