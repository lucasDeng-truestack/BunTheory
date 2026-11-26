"use client";

import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type ReactNode, type Ref } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ApiError, type CateringBookingMine } from "@/lib/api";
import { authClient, clearAuthToken, getAuthToken } from "@/lib/auth-client";
import { getMyBookings } from "@/lib/catering-api";
import { accountCopy, RESEND_SECONDS } from "@/lib/content";
import { formatLong } from "@/lib/dates";
import { isEmail, LIMITS, plural } from "@/lib/booking";
import { expo } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Eyebrow } from "@/components/ui/headline";
import { StatusChip } from "@/components/ui/status-chip";
import { accent } from "@/components/sections/accent";
import { useCustomer } from "@/components/account/use-customer";

const a = accountCopy;
const FORM = "grid max-w-[440px] gap-5";
const textButton =
  "inline-flex min-h-11 w-fit items-center font-semibold text-cream underline decoration-ember underline-offset-4 disabled:cursor-not-allowed disabled:text-cream-faint disabled:no-underline";

type Problem = { text: string; n: number };

/** The step's headline: eyebrow, display h1 (focusable, so a step change can land on it). */
function StepHead({ eyebrow, headline, headingRef }: { eyebrow: ReactNode; headline: string; headingRef?: Ref<HTMLHeadingElement> }) {
  return (
    <div className="grid justify-items-start gap-5">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 ref={headingRef} tabIndex={-1} className="display-lg m-0 text-balance focus:outline-none">
        {accent(headline)}
      </h1>
    </div>
  );
}

function ErrorBanner({ text, bannerRef }: { text?: string | null; bannerRef?: Ref<HTMLDivElement> }) {
  if (!text) return null;
  return (
    <div ref={bannerRef} tabIndex={-1} className="focus:outline-none">
      <Banner tone="error" title={text} />
    </div>
  );
}

// ─── The three views (prop-driven, also shown on /dev/components) ────────────

export function EmailStep({
  email,
  onEmail,
  onSubmit,
  busy,
  error,
  ended,
  fieldRef,
  bannerRef,
}: {
  email: string;
  onEmail: (v: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  error?: string | null;
  /** The stored session was dead: say so quietly. */
  ended?: boolean;
  fieldRef?: Ref<HTMLInputElement>;
  bannerRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div className="grid justify-items-start gap-6">
      <StepHead eyebrow={a.eyebrow} headline={a.email.headline} />
      <p className="type-body-lg m-0 max-w-[44ch] text-cream-muted">{a.email.lead}</p>
      {ended && <p className="type-body m-0 text-cream">{a.email.ended}</p>}
      <form
        noValidate
        className={`${FORM} w-full`}
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <ErrorBanner text={error} bannerRef={bannerRef} />
        <Field
          ref={fieldRef}
          label={a.email.label}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={160}
          placeholder={a.email.placeholder}
          value={email}
          onChange={(e) => onEmail(e.target.value)}
        />
        <Button type="submit" loading={busy} loadingLabel={a.email.sending} aria-disabled={busy || undefined}>
          {a.email.send}
        </Button>
      </form>
      <p className="type-small m-0 max-w-[44ch] text-cream-muted">{a.email.linkNote}</p>
    </div>
  );
}

export function CodeStep({
  email,
  code,
  onCode,
  onSubmit,
  onChangeEmail,
  onResend,
  resendLeft,
  resending,
  resent,
  busy,
  error,
  fieldRef,
  bannerRef,
}: {
  email: string;
  code: string;
  onCode: (v: string) => void;
  onSubmit: () => void;
  onChangeEmail: () => void;
  onResend: () => void;
  /** Seconds until a new code may be sent; 0 = now. */
  resendLeft: number;
  resending?: boolean;
  resent?: boolean;
  busy?: boolean;
  error?: string | null;
  fieldRef?: Ref<HTMLInputElement>;
  bannerRef?: Ref<HTMLDivElement>;
}) {
  // Pasted codes often carry spaces ("123 456"); maxLength would cut them before onChange.
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    onCode(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6));
  };
  return (
    <div className="grid justify-items-start gap-6">
      <StepHead eyebrow={a.eyebrow} headline={a.code.headline} />
      <p className="type-body-lg m-0 max-w-[44ch] break-words text-cream-muted">{a.code.sentTo(email)}</p>
      <form
        noValidate
        className={`${FORM} w-full`}
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <ErrorBanner text={error} bannerRef={bannerRef} />
        {resent && !error && <Banner tone="ok" title={a.code.resent} />}
        <Field
          ref={fieldRef}
          label={a.code.label}
          // The code large and spaced, as in the prototype (24px, 0.3em, bold, tabular).
          className="[&_input]:text-2xl [&_input]:font-bold [&_input]:tabular-nums [&_input]:tracking-[0.3em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder={a.code.placeholder}
          value={code}
          onChange={(e) => onCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onPaste={onPaste}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={busy} loadingLabel={a.code.submitting} aria-disabled={busy || undefined}>
            {a.code.submit}
          </Button>
          <Button type="button" variant="ghost" onClick={onChangeEmail}>
            {a.code.change}
          </Button>
        </div>
      </form>
      <button type="button" className={textButton} onClick={onResend} disabled={resendLeft > 0 || resending}>
        {resendLeft > 0 ? a.code.resendIn(resendLeft) : a.code.resend}
      </button>
    </div>
  );
}

function BookingCard({ b }: { b: CateringBookingMine }) {
  return (
    <li>
      <Link
        href={`/booking/${encodeURIComponent(b.accessToken)}`}
        className="grid gap-3 rounded-card-md border border-ink-line bg-ink-raised p-5 text-cream no-underline transition-colors hover:border-cream-faint"
      >
        <span className="flex flex-wrap items-center justify-between gap-3">
          <b className="font-semibold tracking-[0.06em]">{b.reference}</b>
          <StatusChip status={b.status} />
        </span>
        <span className="text-xl font-bold">{formatLong(b.eventDate)}</span>
        <span className="type-small flex flex-wrap items-center justify-between gap-3 text-cream-muted">
          <span>
            {b.packageName} · {plural(b.guests, "guest")}
          </span>
          <span aria-hidden className="font-semibold text-cream underline decoration-ember underline-offset-4">
            {a.list.open}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function BookingsView({
  email,
  bookings,
  failed,
  onRetry,
  onSignOut,
  signingOut,
  headingRef,
}: {
  email: string;
  /** null while loading. */
  bookings: CateringBookingMine[] | null;
  failed?: boolean;
  onRetry: () => void;
  onSignOut: () => void;
  signingOut?: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  let body;
  if (failed) {
    body = (
      <Banner tone="error" title={a.list.loadFailed}>
        <span className="flex flex-wrap items-center gap-x-4">
          <span>{a.list.loadFailedHelp}</span>
          <button type="button" onClick={onRetry} className={textButton}>
            {a.list.retry}
          </button>
        </span>
      </Banner>
    );
  } else if (!bookings) {
    body = (
      <div aria-busy="true" aria-label="Loading your bookings" className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-[164px] rounded-card-md" />
        ))}
      </div>
    );
  } else if (!bookings.length) {
    body = <EmptyState title={a.list.empty}>{a.list.emptyHelp}</EmptyState>;
  } else {
    body = (
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
        {bookings.map((b) => (
          <BookingCard key={b.reference} b={b} />
        ))}
      </ul>
    );
  }
  return (
    <div className="grid gap-8">
      <StepHead
        eyebrow={
          <span className="min-w-0 break-all">
            {a.list.eyebrow} <span className="normal-case tracking-normal">{email}</span>
          </span>
        }
        headline={a.list.headline}
        headingRef={headingRef}
      />
      {body}
      <div className="flex flex-wrap items-center gap-3">
        <Button href="/catering/book">{a.list.book}</Button>
        <Button type="button" variant="ghost" onClick={onSignOut} loading={signingOut} loadingLabel={a.list.signingOut}>
          {a.list.signOut}
        </Button>
      </div>
    </div>
  );
}

export function AccountLoading() {
  return (
    <div aria-busy="true" aria-label={a.loading} className="grid max-w-[640px] gap-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-20 w-full max-w-[520px]" />
      <Skeleton className="h-14 w-full max-w-[440px]" />
    </div>
  );
}

// ─── The stateful screen ─────────────────────────────────────────────────────

/** Signed-in list: fetches once per mount; a 401 means the stored token is dead. */
function MyBookings({
  email,
  token,
  onExpired,
  onSignOut,
  headingRef,
}: {
  email: string;
  token: string;
  onExpired: () => void;
  onSignOut: () => Promise<void>;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const [bookings, setBookings] = useState<CateringBookingMine[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    setBookings(null);
    try {
      setBookings(await getMyBookings(token));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onExpired();
      setFailed(true);
    }
  }, [token, onExpired]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <BookingsView
      email={email}
      bookings={bookings}
      failed={failed}
      onRetry={() => void load()}
      signingOut={signingOut}
      onSignOut={() => {
        setSigningOut(true);
        void onSignOut();
      }}
      headingRef={headingRef}
    />
  );
}

/**
 * /account: sign in with an emailed 6-digit code, then "Your bookings". Optional everywhere.
 * Never says whether an email has an account: every send moves on to the code step.
 * `next` is already checked by safeNext() on the server page.
 */
/** sessionStorage hand-off of the email to prefill (the done screen's guest prompt); read once, then removed. */
export const SIGNIN_EMAIL_KEY = "br_signin_email";

export function AccountScreen({ next }: { next?: string | null }) {
  const router = useRouter();
  const reduce = usePrefersReducedMotion();
  const customer = useCustomer();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [ended, setEnded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);
  const busyRef = useRef(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const wantFocus = useRef(false);
  const codeEl = useRef<HTMLInputElement | null>(null);

  // An email handed over in sessionStorage (never the URL) prefills the field. It never sends a code.
  useEffect(() => {
    let handed = "";
    try {
      handed = sessionStorage.getItem(SIGNIN_EMAIL_KEY)?.trim() ?? "";
      sessionStorage.removeItem(SIGNIN_EMAIL_KEY);
    } catch {}
    if (isEmail(handed) && handed.length <= LIMITS.customerEmail) setEmail((cur) => cur || handed);
  }, []);

  // Resend countdown: ticks only while it runs.
  const resendLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    if (resendLeft <= 0) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [resendLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new problem is announced (role="alert") and takes focus, also when the text repeats.
  useEffect(() => {
    if (problem) bannerRef.current?.focus();
  }, [problem]);

  // The next view mounts after the old one fades out: focus its target on mount.
  const focusOnMount = useCallback((el: HTMLElement | null) => {
    if (el && wantFocus.current) {
      wantFocus.current = false;
      el.focus({ preventScroll: true });
    }
  }, []);

  const fail = (text: string) => setProblem((p) => ({ text, n: (p?.n ?? 0) + 1 }));

  const lock = (on: boolean) => {
    busyRef.current = on;
    setBusy(on);
  };

  async function sendCode(resend: boolean) {
    const value = email.trim().toLowerCase();
    if (!isEmail(value)) return fail(a.errors.badEmail);
    if (busyRef.current) return;
    lock(true);
    if (resend) setResending(true);
    setProblem(null);
    setResent(false);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({ email: value, type: "sign-in" });
      if (error) return fail(error.status === 429 ? a.errors.rateLimited : a.errors.sendFailed);
      const t = Date.now();
      setNow(t);
      setResendAt(t + RESEND_SECONDS * 1000);
      setEmail(value);
      setCode("");
      if (resend) {
        setResent(true);
        // The resend button is now disabled (countdown): keep focus somewhere useful.
        codeEl.current?.focus();
      } else {
        wantFocus.current = true;
        setEnded(false);
        setStep("code");
      }
    } catch {
      fail(a.errors.sendFailed);
    } finally {
      lock(false);
      setResending(false);
    }
  }

  async function signIn() {
    if (!/^\d{6}$/.test(code)) return fail(a.errors.sixDigits);
    if (busyRef.current) return;
    lock(true);
    setProblem(null);
    setResent(false);
    try {
      const { error } = await authClient.signIn.emailOtp({ email, otp: code });
      if (error) {
        const byCode: Record<string, string> = {
          INVALID_OTP: a.errors.wrong,
          OTP_EXPIRED: a.errors.expired,
          TOO_MANY_ATTEMPTS: a.errors.tooManyTries,
        };
        return fail((error.code && byCode[error.code]) || (error.status === 429 ? a.errors.rateLimited : a.errors.signInFailed));
      }
      // The client stores the bearer token from the response header (lib/auth-client).
      if (!getAuthToken()) return fail(a.errors.signInFailed);
      if (next) setLeaving(true);
      else wantFocus.current = true;
      await customer.refresh();
      setCode("");
      setStep("email");
      if (next) router.replace(next);
    } catch {
      fail(a.errors.signInFailed);
    } finally {
      lock(false);
    }
  }

  const onExpired = useCallback(() => {
    clearAuthToken();
    setEnded(true);
    void customer.refresh();
  }, [customer.refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSignOut = async () => {
    wantFocus.current = true;
    setEmail(customer.email);
    await customer.signOut();
  };

  const view = leaving || customer.status === "loading" ? "loading" : customer.status === "signed-in" ? "list" : step;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: reduce ? 0 : 0.2, ease: expo.out }}
        className="rm-static"
      >
        {view === "loading" && <AccountLoading />}
        {view === "list" && (
          <MyBookings
            email={customer.email}
            token={customer.token}
            onExpired={onExpired}
            onSignOut={onSignOut}
            headingRef={focusOnMount}
          />
        )}
        {view === "email" && (
          <EmailStep
            email={email}
            onEmail={(v) => {
              setEmail(v);
              if (problem) setProblem(null);
            }}
            onSubmit={() => void sendCode(false)}
            busy={busy}
            error={problem?.text}
            ended={ended}
            fieldRef={focusOnMount}
            bannerRef={bannerRef}
          />
        )}
        {view === "code" && (
          <CodeStep
            email={email}
            code={code}
            onCode={(v) => {
              setCode(v);
              if (problem) setProblem(null);
            }}
            onSubmit={() => void signIn()}
            onChangeEmail={() => {
              wantFocus.current = true;
              setProblem(null);
              setResent(false);
              setStep("email");
            }}
            onResend={() => void sendCode(true)}
            resendLeft={resendLeft}
            resending={resending}
            resent={resent}
            busy={busy && !resending}
            error={problem?.text}
            fieldRef={(el) => {
              codeEl.current = el;
              focusOnMount(el);
            }}
            bannerRef={bannerRef}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
