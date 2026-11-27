"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, ReceiptText } from "lucide-react";
import { ApiError } from "@/lib/api";
import { authClient, clearAuthToken, getAuthToken } from "@/lib/auth-client";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatRM } from "@/lib/money";
import { getMyOrders } from "@/services/orders.service";
import { useCustomer } from "@/hooks/use-customer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order } from "@/types/order";

const card = "rounded-4xl border-2 border-bun-ink bg-white p-6 shadow-sticker sm:p-8";
/** Seconds before another code can be requested. */
const RESEND_SECONDS = 60;
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 160;

/**
 * /account: sign in with an emailed 6-digit code (no password; the same steps create the
 * account), then "My orders". Optional everywhere: guests order exactly as before. It never
 * says whether an email already has an account.
 */
export function AccountView({ next }: { next: string | null }) {
  const router = useRouter();
  const customer = useCustomer();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);
  const [ended, setEnded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const busyRef = useRef(false);

  const resendLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    if (resendLeft <= 0) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [resendLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const lock = (on: boolean) => {
    busyRef.current = on;
    setBusy(on);
  };

  async function sendCode() {
    const value = email.trim().toLowerCase();
    if (!isEmail(value)) return setError("Enter an email like you@example.com.");
    if (busyRef.current) return;
    lock(true);
    setError("");
    try {
      const { error: err } = await authClient.emailOtp.sendVerificationOtp({ email: value, type: "sign-in" });
      if (err) {
        return setError(
          err.status === 429
            ? "Too many tries. Wait a minute, then try again."
            : "We could not send a code just now. Try again in a moment."
        );
      }
      const t = Date.now();
      setNow(t);
      setResendAt(t + RESEND_SECONDS * 1000);
      setEmail(value);
      setCode("");
      setEnded(false);
      setStep("code");
    } catch {
      setError("We could not send a code just now. Try again in a moment.");
    } finally {
      lock(false);
    }
  }

  async function signIn() {
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6 digits from the email.");
    if (busyRef.current) return;
    lock(true);
    setError("");
    try {
      const { error: err } = await authClient.signIn.emailOtp({ email, otp: code });
      if (err) {
        const byCode: Record<string, string> = {
          INVALID_OTP: "That code is not right. Check the email and try again.",
          OTP_EXPIRED: "That code has expired. Send a new one.",
          TOO_MANY_ATTEMPTS: "Too many tries. Send a new code.",
        };
        return setError(
          (err.code && byCode[err.code]) ||
            (err.status === 429
              ? "Too many tries. Wait a minute, then try again."
              : "We could not sign you in just now. Try again in a moment.")
        );
      }
      if (!getAuthToken()) return setError("We could not sign you in just now. Try again in a moment.");
      if (next) setLeaving(true);
      await customer.refresh();
      setCode("");
      setStep("email");
      if (next) router.replace(next);
    } catch {
      setError("We could not sign you in just now. Try again in a moment.");
    } finally {
      lock(false);
    }
  }

  const onExpired = useCallback(() => {
    clearAuthToken();
    setEnded(true);
    void customer.refresh();
  }, [customer.refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  if (leaving || customer.status === "loading") {
    return (
      <div className={card} aria-busy="true" aria-label="Checking your sign-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-12 w-full" />
      </div>
    );
  }

  if (customer.status === "signed-in") {
    return <MyOrders email={customer.email} token={customer.token} onExpired={onExpired} onSignOut={customer.signOut} />;
  }

  return (
    <div className={card}>
      {step === "email" ? (
        <form
          noValidate
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
        >
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold tracking-tight text-bun-ink sm:text-3xl">Sign in</h2>
            <p className="text-pretty text-sm leading-relaxed text-bun-ink-soft sm:text-base">
              See your orders and check out faster next time. No password: we email you a 6-digit code. New here? The
              same steps create your account.
            </p>
            {ended ? <p className="text-sm font-semibold text-bun-ink">Your session ended. Sign in again.</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-email" className="font-display">
              Email
            </Label>
            <Input
              id="acc-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={160}
              placeholder="you@example.com"
              value={email}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "acc-error" : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
            />
          </div>
          {error ? (
            <p id="acc-error" role="alert" className="text-sm font-semibold text-bun-red">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="hero" size="lg" className="min-h-12 w-full sm:w-auto" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
            {busy ? "Sending" : "Send me a code"}
          </Button>
          <p className="text-caption">You can always order without an account.</p>
        </form>
      ) : (
        <form
          noValidate
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void signIn();
          }}
        >
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold tracking-tight text-bun-ink sm:text-3xl">Check your email</h2>
            <p className="break-words text-pretty text-sm leading-relaxed text-bun-ink-soft sm:text-base">
              We sent a 6-digit code to {email}. It expires in 5 minutes.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-code" className="font-display">
              Code
            </Label>
            <Input
              id="acc-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="6 digits"
              autoFocus
              className="max-w-[220px] text-2xl font-bold tabular-nums tracking-[0.3em]"
              value={code}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "acc-error" : undefined}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (error) setError("");
              }}
              onPaste={(e) => {
                // Pasted codes often carry spaces ("123 456"); maxLength would cut them short.
                e.preventDefault();
                setCode(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6));
              }}
            />
          </div>
          {error ? (
            <p id="acc-error" role="alert" className="text-sm font-semibold text-bun-red">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" variant="hero" size="lg" className="min-h-12" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
              {busy ? "Signing in" : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-12 rounded-full"
              onClick={() => {
                setError("");
                setStep("email");
              }}
            >
              Use a different email
            </Button>
          </div>
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={resendLeft > 0 || busy}
            className="min-h-11 font-display text-sm font-semibold text-bun-ink underline underline-offset-4 disabled:cursor-not-allowed disabled:text-bun-ink-soft/60 disabled:no-underline"
          >
            {resendLeft > 0 ? `Send a new code in ${resendLeft}s` : "Send a new code"}
          </button>
        </form>
      )}
    </div>
  );
}

const orderDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

const itemsLine = (o: Order) =>
  o.orderItems.map((i) => `${i.quantity} × ${i.menu?.name ?? "Item"}`).join(", ");

/** The signed-in view: the customer's own orders, newest first. A 401 means the sign-in is gone. */
function MyOrders({
  email,
  token,
  onExpired,
  onSignOut,
}: {
  email: string;
  token: string;
  onExpired: () => void;
  onSignOut: () => Promise<void>;
}) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    setOrders(null);
    try {
      setOrders((await getMyOrders(token)).orders);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onExpired();
      setFailed(true);
    }
  }, [token, onExpired]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className={card}>
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-bun-red">Signed in as</p>
        <p className="mt-1 break-all font-display text-lg font-bold text-bun-ink">{email}</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="hero" size="lg" className="min-h-12">
            <Link href="/menu">Order now</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-12 rounded-full"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              void onSignOut();
            }}
          >
            {signingOut ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <LogOut className="mr-2 h-5 w-5" aria-hidden />
            )}
            {signingOut ? "Signing out" : "Sign out"}
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold tracking-tight text-bun-ink">My orders</h2>
        {failed ? (
          <div className={card}>
            <p className="font-semibold text-bun-ink">We could not load your orders.</p>
            <p className="mt-1 text-sm text-bun-ink-soft">Check the connection and try again.</p>
            <Button type="button" variant="yellow" className="mt-4 min-h-12" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : !orders ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading your orders">
            <Skeleton className="h-28 w-full rounded-3xl" />
            <Skeleton className="h-28 w-full rounded-3xl" />
          </div>
        ) : orders.length === 0 ? (
          <div className={card}>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-bun-ink bg-bun-yellow text-bun-ink">
              <ReceiptText className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-4 font-display text-lg font-bold text-bun-ink">No orders here yet.</p>
            <p className="mt-1 text-pretty text-sm leading-relaxed text-bun-ink-soft">
              Orders you place while signed in show up here, on any device. For an earlier order, use{" "}
              <Link href="/track" className="font-semibold text-bun-ink underline underline-offset-4">
                Track
              </Link>{" "}
              with your phone number.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/order/success?id=${encodeURIComponent(o.id)}&from=account`}
                  className="block rounded-3xl border-2 border-bun-ink bg-white p-5 shadow-sticker transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-red/40 focus-visible:ring-offset-2"
                >
                  <span className="flex flex-wrap items-center justify-between gap-3">
                    <b className="font-display text-lg font-bold text-bun-ink">{o.slugId ?? "Order"}</b>
                    <span className="rounded-full border-2 border-bun-ink bg-bun-yellow px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide text-bun-ink">
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </span>
                  <span className="mt-2 block text-sm text-bun-ink-soft [overflow-wrap:anywhere]">{itemsLine(o)}</span>
                  <span className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-bun-ink-soft">
                    <span>
                      {orderDate(o.createdAt)} · {o.type === "DELIVERY" ? "Delivery" : "Pickup"}
                    </span>
                    {o.total != null ? <b className="font-display text-base text-bun-ink">{formatRM(o.total)}</b> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
