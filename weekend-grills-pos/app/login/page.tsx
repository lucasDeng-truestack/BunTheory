'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, hydrated, hydrate } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
    <div className="flex min-h-screen items-center justify-center bg-bbq-charcoal">
      <div className="w-full max-w-sm space-y-8 px-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bbq-flame shadow-lg shadow-bbq-flame/30">
            <Flame className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-black text-white tracking-wide">
              The Weekend Grills
            </h1>
            <p className="text-stone-500 text-sm font-display mt-1">
              Point of Sale System
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

        <p className="text-center text-[11px] text-stone-600 font-display">
          Tropical Vibe Barbeque
        </p>
      </div>
    </div>
  );
}
