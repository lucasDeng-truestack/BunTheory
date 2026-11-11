"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { adminLogin } from "@/lib/catering-api";
import { readSession, saveSession } from "@/lib/admin-session";
import { adminCopy } from "@/lib/content";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ADMIN_TITLE } from "@/components/admin/admin-page";

const copy = adminCopy.login;

/** Owner sign in: wordmark, email, password, one ember button, error Banner. Outside the shell. */
export function LoginForm() {
  const router = useRouter();
  const expired = useSearchParams().get("expired") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errs, setErrs] = useState({ email: "", password: "" });
  const [banner, setBanner] = useState<{ title: string; help?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in: straight to Today.
  useEffect(() => {
    if (readSession().session) router.replace("/admin");
  }, [router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = {
      email: email.trim() ? "" : copy.emailMissing,
      password: password ? "" : copy.passwordMissing,
    };
    setErrs(next);
    if (next.email || next.password) return;
    setBusy(true);
    setBanner(null);
    try {
      const { accessToken, admin } = await adminLogin(email.trim(), password);
      saveSession({ token: accessToken, admin });
      router.replace("/admin");
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && (err.status === 401 || err.status === 400))
        setBanner({ title: copy.wrong, help: copy.wrongHelp });
      else if (err instanceof ApiError && err.status === 429) setBanner({ title: copy.tooMany, help: copy.tooManyHelp });
      else setBanner({ title: adminCopy.errors.loadFailed, help: adminCopy.errors.loadFailedHelp });
    }
  };

  return (
    <div className="type-admin-body min-h-screen bg-ink px-4">
      <form noValidate onSubmit={submit} className="mx-auto grid max-w-[400px] animate-fade-in gap-5 py-24">
        <Link
          href="/"
          className="block w-fit py-2.5 font-display text-2xl font-extrabold uppercase leading-none text-cream no-underline [font-stretch:80%]"
        >
          Bakar <span className="text-ember">&amp;</span> Roast
        </Link>
        <div>
          <h1 className={ADMIN_TITLE}>{copy.title}</h1>
          <p className="mb-0 mt-2.5 text-cream-muted">{copy.sub}</p>
        </div>
        {banner ? (
          <Banner tone="error" title={banner.title}>
            {banner.help}
          </Banner>
        ) : (
          expired && <Banner tone="ok" title={copy.expired} />
        )}
        <Field
          label="Email"
          type="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          error={errs.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          error={errs.password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" block loading={busy} loadingLabel={copy.busy}>
          {copy.submit}
        </Button>
        <Link href="/" className="inline-flex min-h-11 w-fit items-center font-semibold text-cream-muted underline">
          {copy.back}
        </Link>
      </form>
    </div>
  );
}
