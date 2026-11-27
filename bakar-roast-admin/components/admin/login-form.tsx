"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { adminLogin, adminLoginWithCode, adminSendLoginCode } from "@/lib/catering-api";
import { readSession, saveSession } from "@/lib/admin-session";
import { adminCopy } from "@/lib/content";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Logo } from "@/components/ui/logo";
import { Pill } from "@/components/ui/pill";
import { ADMIN_TITLE } from "@/components/admin/admin-page";

const copy = adminCopy.login;

type Method = "password" | "code";
type Notice = { tone: "error" | "ok"; title: string; help?: string } | null;

const textLink = "inline-flex min-h-11 w-fit items-center font-semibold text-cream-muted underline";

/**
 * Staff sign in: email, then either the password or a 6-digit code emailed to them (pick with
 * the two pills). Outside the shell. The code path is two steps: send the code, then enter it.
 */
export function LoginForm() {
  const router = useRouter();
  const expired = useSearchParams().get("expired") === "1";
  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  /** The email a code was sent to; set means the code step is showing. */
  const [codeSentTo, setCodeSentTo] = useState("");
  const [errs, setErrs] = useState({ email: "", password: "", code: "" });
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in: straight to Today.
  useEffect(() => {
    if (readSession().session) router.replace("/admin");
  }, [router]);

  const fail = (err: unknown, wrong: { title: string; help: string }) => {
    setBusy(false);
    if (err instanceof ApiError && (err.status === 401 || err.status === 400)) setNotice({ tone: "error", ...wrong });
    else if (err instanceof ApiError && err.status === 429) setNotice({ tone: "error", title: copy.tooMany, help: copy.tooManyHelp });
    else setNotice({ tone: "error", title: adminCopy.errors.loadFailed, help: adminCopy.errors.loadFailedHelp });
  };

  const signedIn = ({ accessToken, admin }: Awaited<ReturnType<typeof adminLogin>>) => {
    saveSession({ token: accessToken, admin });
    router.replace("/admin");
  };

  const pick = (m: Method) => {
    setMethod(m);
    setNotice(null);
    setErrs({ email: "", password: "", code: "" });
  };

  const sendCode = async (again = false) => {
    const to = again ? codeSentTo : email.trim();
    if (!to) {
      setErrs((e) => ({ ...e, email: copy.emailMissing }));
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await adminSendLoginCode(to);
      setBusy(false);
      setCodeSentTo(to);
      setCode("");
      setErrs({ email: "", password: "", code: "" });
      if (again) setNotice({ tone: "ok", title: copy.resent });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setBusy(false);
        setErrs((x) => ({ ...x, email: "Enter a full email, like you@example.com." }));
      } else fail(err, { title: copy.tooMany, help: copy.tooManyHelp });
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (method === "code") {
      if (!codeSentTo) return sendCode();
      if (!/^\d{6}$/.test(code.trim())) {
        setErrs((x) => ({ ...x, code: copy.codeMissing }));
        return;
      }
      setBusy(true);
      setNotice(null);
      try {
        signedIn(await adminLoginWithCode(codeSentTo, code.trim()));
      } catch (err) {
        fail(err, { title: copy.codeWrong, help: copy.codeWrongHelp });
      }
      return;
    }
    const next = {
      email: email.trim() ? "" : copy.emailMissing,
      password: password ? "" : copy.passwordMissing,
      code: "",
    };
    setErrs(next);
    if (next.email || next.password) return;
    setBusy(true);
    setNotice(null);
    try {
      signedIn(await adminLogin(email.trim(), password));
    } catch (err) {
      fail(err, { title: copy.wrong, help: copy.wrongHelp });
    }
  };

  const codeStep = method === "code" && !!codeSentTo;

  return (
    <div className="type-admin-body min-h-screen bg-ink px-4">
      <form noValidate onSubmit={submit} className="mx-auto grid max-w-[400px] animate-fade-in gap-5 py-24">
        <Link href="/" aria-label="Bakar & Roast, back to the site" className="block w-fit no-underline">
          <Logo priority className="h-28" />
        </Link>
        <div>
          <h1 className={ADMIN_TITLE}>{copy.title}</h1>
          <p className="mb-0 mt-2.5 text-cream-muted">{copy.sub}</p>
        </div>
        {notice ? (
          <Banner tone={notice.tone} title={notice.title}>
            {notice.help}
          </Banner>
        ) : (
          expired && <Banner tone="ok" title={copy.expired} />
        )}

        <div role="radiogroup" aria-label="Sign in with" className="flex flex-wrap gap-2">
          <Pill mode="radio" selected={method === "password"} onClick={() => pick("password")}>
            {copy.withPassword}
          </Pill>
          <Pill mode="radio" selected={method === "code"} onClick={() => pick("code")}>
            {copy.withCode}
          </Pill>
        </div>

        {codeStep ? (
          <>
            <p className="m-0 text-cream-muted">{copy.codeSent(codeSentTo)}</p>
            <Field
              key="code"
              label={copy.codeLabel}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              value={code}
              error={errs.code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                setErrs((x) => ({ ...x, code: "" }));
              }}
            />
            <Button type="submit" block loading={busy} loadingLabel={copy.busy}>
              {copy.submit}
            </Button>
            <div className="flex flex-wrap gap-x-6">
              <button type="button" className={textLink} disabled={busy} onClick={() => sendCode(true)}>
                {copy.resend}
              </button>
              <button
                type="button"
                className={textLink}
                onClick={() => {
                  setCodeSentTo("");
                  setCode("");
                  setNotice(null);
                }}
              >
                {copy.otherEmail}
              </button>
            </div>
          </>
        ) : (
          <>
            <Field
              label="Email"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              error={errs.email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrs((x) => ({ ...x, email: "" }));
              }}
            />
            {method === "password" && (
              <Field
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                error={errs.password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
            <Button
              type="submit"
              block
              loading={busy}
              loadingLabel={method === "code" ? copy.sendingCode : copy.busy}
            >
              {method === "code" ? copy.sendCode : copy.submit}
            </Button>
          </>
        )}
        <Link href="/" className={textLink}>
          {copy.back}
        </Link>
      </form>
    </div>
  );
}
