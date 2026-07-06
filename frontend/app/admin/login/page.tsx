"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "@/services/admin.service";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND_FULL_NAME } from "@/lib/brand";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { accessToken } = await login(form);
      localStorage.setItem("admin_token", accessToken);
      toast.success("Welcome back!");
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-hero-warm px-4 py-12">
      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 rounded-3xl border-2 border-bun-ink bg-white p-3 shadow-sticker">
            <BrandLogo size="lg" priority />
          </div>
          <span className="mb-3 inline-flex items-center rounded-full border-2 border-bun-ink bg-bun-yellow px-3 py-0.5 font-display text-xs font-bold uppercase tracking-[0.15em] text-bun-ink shadow-sticker">
            Staff
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-bun-ink">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-bun-ink-soft">{BRAND_FULL_NAME}</p>
        </div>

        <Card className="border-2 border-bun-ink shadow-sticker-lg">
          <CardHeader className="space-y-1 pb-2">
            <div className="admin-accent-bar mb-3" />
            <CardTitle className="text-center font-display text-xl font-bold text-bun-ink">
              Admin login
            </CardTitle>
            <p className="text-center text-sm text-bun-ink-soft">
              Use your admin credentials to manage orders.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border-2 border-bun-red/30 bg-bun-red/10 px-3 py-2 text-sm font-medium text-bun-red-deep">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="font-display font-semibold text-bun-ink">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@buntheory.com"
                  autoComplete="username"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-display font-semibold text-bun-ink">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  required
                />
              </div>
              <Button type="submit" variant="hero" className="w-full min-h-12" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
