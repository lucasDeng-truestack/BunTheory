"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLenis } from "lenis/react";
import { ApiError, type CateringAvailability, type CateringPackagePublic } from "@/lib/api";
import {
  createBooking,
  getAvailability,
  getCateringRules,
  getPackages,
  type CateringRules,
  type CreateBookingInput,
} from "@/lib/catering-api";
import { bookingCopy, waLink } from "@/lib/content";
import { formatDayMonth, formatLong, formatShort, klToday, klYmd } from "@/lib/dates";
import {
  classifyDay,
  clampGuests,
  DETAIL_FIELDS,
  formatTime12,
  hoursFor,
  isPickable,
  joinAddress,
  validateDetails,
  validateField,
  type DetailsField,
} from "@/lib/booking";
import { expo } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { Band, Container } from "@/components/ui/band";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { BookingProgress, type BookingStep } from "@/components/ui/booking-progress";
import { AccordionItem, TipCard } from "@/components/ui/accordion";
import { accent } from "@/components/sections/accent";
import { StickyBar, SummaryCard } from "@/components/booking/booking-summary";
import {
  DoneScreen,
  fieldId,
  StepDate,
  StepDetails,
  StepPackage,
  StepReview,
  type Answers,
} from "@/components/booking/steps";

const DRAFT_KEY = "br-booking-draft";

const EMPTY: Answers = {
  date: null,
  packageId: null,
  guests: null,
  serviceTime: "",
  addressLine1: "",
  addressLine2: "",
  postcode: "",
  city: "",
  state: "",
  paymentChoice: "DEPOSIT",
  dietaryNotes: "",
  notes: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  website: "",
};

type Contact = Partial<Pick<Answers, "customerName" | "customerPhone" | "customerEmail">>;

type Notice = { title: ReactNode; body?: ReactNode; retry?: boolean; chat?: boolean; pending?: boolean };

type Done = { reference: string; accessToken: string; phone: string; email: string; heldUntil: string | null };

/** Server date messages carry YYYY-MM-DD: write them in words. */
const inWords = (msg: string) => msg.replace(/\d{4}-\d{2}-\d{2}/g, (d) => formatLong(d));

const linkClass = "font-semibold text-cream underline decoration-ember underline-offset-4";

/**
 * The whole /catering/book flow: four steps plus the done screen. All answers live here and
 * survive going back, and a refresh (sessionStorage, cleared on success). No personal details
 * go in the URL.
 *
 * Account seams (for the signed-in customer work, from a client wrapper):
 * - `initialContact` prefills name, phone and email where empty; `contactNote` replaces the
 *   line above the contact fields ("Signed in as ...").
 * - `customerToken` is sent with the request so it is saved to the account.
 * - `renderDoneAccount({ email, reference })` draws the done-screen account prompt.
 * - `renderPendingHelp()` adds links to the waiting requests inside the TOO_MANY_PENDING banner.
 */
export function BookingFlow({
  rules: initialRules,
  packages: initialPackages,
  initialPackageId,
  initialOccasion,
  initialContact,
  contactNote,
  customerToken,
  renderDoneAccount,
  renderPendingHelp,
}: {
  rules: CateringRules;
  packages: CateringPackagePublic[];
  initialPackageId?: string;
  initialOccasion?: string;
  initialContact?: Contact;
  contactNote?: ReactNode;
  customerToken?: string;
  renderDoneAccount?: (info: { email: string; reference: string }) => ReactNode;
  renderPendingHelp?: () => ReactNode;
}) {
  const reduce = usePrefersReducedMotion();
  const lenis = useLenis();
  const [rules, setRules] = useState(initialRules);
  const [packages, setPackages] = useState(initialPackages);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [step, setStep] = useState<BookingStep>(1);
  const [done, setDone] = useState<Done | null>(null);
  const [restored, setRestored] = useState(false);
  const [availability, setAvailability] = useState<CateringAvailability | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [availFailed, setAvailFailed] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<DetailsField, boolean>>>({});
  const [guestNote, setGuestNote] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);

  const pkg = packages.find((p) => p.id === answers.packageId) ?? null;
  const dayHours = hoursFor(availability, answers.date);
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setAnswers((a) => ({ ...a, [k]: v }));

  // Restore the draft once, then apply the URL's package and occasion (read once, then dropped).
  useEffect(() => {
    let draft: { step?: BookingStep; answers?: Partial<Answers> } = {};
    try {
      draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
    } catch {}
    const next: Answers = { ...EMPTY, ...draft.answers, website: "" };
    const fromUrl = initialPackageId && initialPackages.find((p) => p.id === initialPackageId);
    if (fromUrl) {
      next.packageId = fromUrl.id;
      next.guests = next.guests == null ? fromUrl.minGuests : clampGuests(next.guests, fromUrl.minGuests, fromUrl.maxGuests);
    }
    // The occasion is no longer asked for; ?occasion= links from the home page still land here.
    if (next.paymentChoice !== "FULL") next.paymentChoice = "DEPOSIT";
    for (const k of ["customerName", "customerPhone", "customerEmail"] as const) {
      if (!next[k] && initialContact?.[k]) next[k] = initialContact[k]!;
    }
    // A package that is gone since the draft was saved.
    if (next.packageId && !initialPackages.some((p) => p.id === next.packageId)) {
      next.packageId = null;
      next.guests = null;
    }
    let s: BookingStep = draft.step ?? 1;
    if (s > 1 && !next.date) s = 1;
    if (s > 2 && !next.packageId) s = 2;
    if (s > 3 && Object.keys(validateDetails(next)).length) s = 3;
    setAnswers(next);
    setStep(s);
    setRestored(true);
    if (initialPackageId || initialOccasion) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Contact details that arrive after mount (a sign-in check finishing) fill only empty fields.
  useEffect(() => {
    if (!restored || !initialContact) return;
    setAnswers((a) => {
      const n = { ...a };
      for (const k of ["customerName", "customerPhone", "customerEmail"] as const) {
        if (!n[k] && initialContact[k]) n[k] = initialContact[k]!;
      }
      return n;
    });
  }, [restored, initialContact?.customerName, initialContact?.customerPhone, initialContact?.customerEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save after the restore has run, and never after success (that would rewrite a cleared draft).
  useEffect(() => {
    if (!restored || done) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, answers: { ...answers, website: "" } }));
    } catch {}
  }, [answers, step, restored, done]);

  const loadAvailability = useCallback(async () => {
    setAvailFailed(false);
    try {
      const a = await getAvailability();
      setToday(klToday());
      setAvailability(a);
    } catch {
      setAvailFailed(true);
    }
  }, []);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  // A restored date that is no longer open: clear it and send the customer back to step 1.
  useEffect(() => {
    if (!availability || !today || !restored || !answers.date) return;
    const state = classifyDay(answers.date, { today, availability, taken: new Set(availability.unavailable), selected: answers.date });
    if (!isPickable(state)) {
      set("date", null);
      setStep(1);
      setNotice(bookingCopy.errors.dateTaken);
    }
    // Only when availability arrives or changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability, today, restored]);

  // A time outside the chosen day's delivery hours (after a date change) is cleared.
  useEffect(() => {
    const t = answers.serviceTime;
    if (t && (t < dayHours.start || t > dayHours.end)) setAnswers((a) => ({ ...a, serviceTime: "" }));
  }, [answers.serviceTime, dayHours.start, dayHours.end]);

  const toTop = () => {
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  };

  // The next step's heading mounts after the old step fades out, so focus it on mount.
  // Skipped when a notice took focus first.
  const focusOnMount = useCallback((el: HTMLHeadingElement | null) => {
    if (el && pendingFocus.current) {
      pendingFocus.current = false;
      el.focus({ preventScroll: true });
    }
  }, []);

  // A new notice is announced (role="alert") and takes focus so keyboard users land on it.
  useEffect(() => {
    if (notice) noticeRef.current?.focus({ preventScroll: false });
  }, [notice]);

  const goTo = (s: BookingStep, keep?: Notice) => {
    pendingFocus.current = !keep;
    toTop();
    setNotice(keep ?? null);
    setStep(s);
  };

  const onPackage = (id: string) => {
    const p = packages.find((x) => x.id === id);
    if (!p) return;
    const prev = answers.guests;
    const next = prev == null ? p.minGuests : clampGuests(prev, p.minGuests, p.maxGuests);
    setGuestNote(prev != null && next !== prev ? bookingCopy.guestMoved(next) : "");
    setAnswers((a) => ({ ...a, packageId: id, guests: next }));
    if (notice) setNotice(null);
  };

  const errors: Partial<Record<DetailsField, string>> = {};
  for (const f of DETAIL_FIELDS) {
    const msg = touched[f] ? validateField(f, answers) : "";
    if (msg) errors[f] = msg;
  }

  async function submit() {
    if (sendingRef.current || !answers.date || !pkg || answers.guests == null) return;
    sendingRef.current = true;
    setSending(true);
    setNotice(null);
    const input: CreateBookingInput = {
      eventDate: answers.date,
      serviceTime: answers.serviceTime,
      packageId: pkg.id,
      guests: answers.guests,
      paymentChoice: answers.paymentChoice,
      customerName: answers.customerName.trim(),
      customerPhone: answers.customerPhone.trim(),
      customerEmail: answers.customerEmail.trim(),
      eventAddress: joinAddress(answers),
      dietaryNotes: answers.dietaryNotes.trim() || undefined,
      notes: answers.notes.trim() || undefined,
      website: answers.website,
    };
    try {
      const created = await createBooking(input, customerToken);
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
      pendingFocus.current = true;
      toTop();
      setDone({
        reference: created.reference,
        accessToken: created.accessToken,
        phone: input.customerPhone,
        email: input.customerEmail,
        heldUntil: created.holdExpiresAt ? formatDayMonth(klYmd(created.holdExpiresAt)) : null,
      });
    } catch (err) {
      onSubmitError(err);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function onSubmitError(err: unknown) {
    const e = bookingCopy.errors;
    const api = err instanceof ApiError ? err : null;
    switch (api?.code) {
      case "DATE_TAKEN":
        set("date", null);
        goTo(1, e.dateTaken);
        void loadAvailability();
        return;
      case "TOO_MANY_PENDING":
        setNotice({ ...e.tooManyPending, chat: true, pending: true });
        return;
      case "DATE_OUT_OF_RANGE":
      case "INVALID_DATE":
        set("date", null);
        goTo(1, { title: inWords(api.message), body: "Pick another date." });
        void loadAvailability();
        void getCateringRules().then(setRules, () => {});
        return;
      case "PACKAGE_UNAVAILABLE":
      case "GUESTS_OUT_OF_RANGE":
        goTo(2, { title: api.message, body: "Choose again and we will keep the rest." });
        void getPackages().then((list) => {
          setPackages(list);
          if (!list.some((p) => p.id === answers.packageId)) setAnswers((a) => ({ ...a, packageId: null, guests: null }));
        }, () => {});
        return;
    }
    if (api?.status === 429) return setNotice({ ...e.rateLimited, chat: true });
    if (api?.status === 400) return setNotice({ title: e.validation.title, body: inWords(api.message) });
    // Network failure, 5xx, or a 409 TRY_AGAIN: nothing was saved.
    setNotice({ ...e.failed, retry: true, chat: true });
  }

  function next() {
    if (step === 1) {
      if (!answers.date) return setNotice(bookingCopy.errors.needDate);
      return goTo(2);
    }
    if (step === 2) {
      if (!pkg) return setNotice(bookingCopy.errors.needPackage);
      return goTo(3);
    }
    if (step === 3) {
      const bad = validateDetails(answers);
      const first = DETAIL_FIELDS.find((f) => bad[f]);
      if (first) {
        setTouched(Object.fromEntries(DETAIL_FIELDS.map((f) => [f, true])));
        // Focus the first invalid field: its message is linked with aria-describedby.
        document.getElementById(fieldId(first))?.focus();
        return;
      }
      return goTo(4);
    }
    void submit();
  }

  const copy = bookingCopy.steps[step - 1];
  const dateWords = answers.date ? formatLong(answers.date) : null;
  const barBits = [answers.date && formatShort(answers.date), pkg?.name, pkg && answers.guests != null && `${answers.guests} pax`].filter(Boolean);
  const nextButton = (
    <Button onClick={next} loading={sending} loadingLabel="Sending" aria-disabled={sending || undefined}>
      {copy.next}
    </Button>
  );
  const fade = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: reduce ? 0 : 0.25, ease: expo.out },
  };

  return (
    <Band tight className="pb-40 pt-[calc(104px+env(safe-area-inset-top))] lg:pb-section">
      <Container className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="grid min-w-0 content-start gap-6">
          {!done && (
            <div className="sticky top-[calc(72px+env(safe-area-inset-top))] z-30 -mx-gutter bg-ink px-gutter pb-3 pt-1 lg:static lg:m-0 lg:bg-transparent lg:p-0">
              <BookingProgress
                current={step}
                backLabel={copy.back}
                {...(step === 1 ? { backHref: "/" } : { onBack: () => goTo((step - 1) as BookingStep) })}
              />
            </div>
          )}

          {notice && (
            <div ref={noticeRef} tabIndex={-1} className="focus:outline-none">
              <Banner tone="error" title={notice.title}>
                {(notice.body || notice.retry || notice.chat) && (
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {notice.body && <span>{notice.body}</span>}
                    {notice.pending && renderPendingHelp?.()}
                    {notice.retry && (
                      <button type="button" onClick={() => void submit()} className={`${linkClass} min-h-11`}>
                        Try again
                      </button>
                    )}
                    {notice.chat && (
                      <a href={waLink(bookingCopy.whatsappMessage)} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
                        Message us
                      </a>
                    )}
                  </span>
                )}
              </Banner>
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={done ? "done" : step} {...fade} className="rm-static grid gap-6">
              {done ? (
                <DoneScreen
                  headingRef={focusOnMount}
                  reference={done.reference}
                  accessToken={done.accessToken}
                  phone={done.phone}
                  heldUntil={done.heldUntil}
                  account={renderDoneAccount?.({ email: done.email, reference: done.reference })}
                />
              ) : (
                <>
                  <h1 ref={focusOnMount} tabIndex={-1} className="display-lg m-0 text-balance focus:outline-none">
                    {accent(copy.headline)}
                  </h1>
                  {step === 1 && (
                    <StepDate
                      rules={rules}
                      availability={availability}
                      today={today}
                      failed={availFailed}
                      onRetry={() => void loadAvailability()}
                      selected={answers.date}
                      onSelect={(d) => {
                        set("date", d);
                        if (notice) setNotice(null);
                      }}
                    />
                  )}
                  {step === 2 && (
                    <StepPackage
                      packages={packages}
                      packageId={answers.packageId}
                      guests={answers.guests}
                      guestNote={guestNote}
                      onPackage={onPackage}
                      onGuests={(n) => {
                        setGuestNote("");
                        set("guests", n);
                      }}
                    />
                  )}
                  {step === 3 && (
                    <StepDetails
                      answers={answers}
                      hours={dayHours}
                      errors={errors}
                      contactNote={contactNote}
                      onChange={(f, v) => set(f, v)}
                      onBlur={(f) => setTouched((t) => (t[f] ? t : { ...t, [f]: true }))}
                    />
                  )}
                  {step === 4 && <StepReview
                      answers={answers}
                      pkg={pkg}
                      rules={rules}
                      onEdit={(s) => goTo(s)}
                      onPaymentChoice={(c) => set("paymentChoice", c)}
                    />}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {!done && <div className="hidden lg:block">{nextButton}</div>}
        </div>

        <aside aria-label="Your booking so far" className="hidden gap-5 lg:sticky lg:top-24 lg:grid">
          <SummaryCard
            as="div"
            title="Your table"
            note={bookingCopy.hold(rules)}
            rows={[
              { label: "Date", value: dateWords },
              { label: "Package", value: pkg?.name },
              { label: "Guests (pax)", value: pkg ? answers.guests : null },
              { label: "Delivery time", value: formatTime12(answers.serviceTime) },
              { label: "Deliver to", value: joinAddress(answers) },
            ]}
          />
          <TipCard>
            <p>{bookingCopy.tip(rules)}</p>
          </TipCard>
          <div>
            {bookingCopy.faq(rules).map((f) => (
              <AccordionItem key={f.q} question={f.q}>
                {f.a}
              </AccordionItem>
            ))}
          </div>
        </aside>
      </Container>

      {!done && (
        <StickyBar
          summary={barBits.length ? barBits.join(" · ") : bookingCopy.nothingYet}
          step={`Step ${step} of 4`}
          action={nextButton}
        />
      )}
    </Band>
  );
}
