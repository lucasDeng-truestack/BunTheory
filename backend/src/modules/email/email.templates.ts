import { CateringBooking } from '@prisma/client';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const C = {
  night: '#0B0908',
  cream: '#F4ECE1',
  ink: '#1B1A16',
  ember: '#E86A1C',
  muted: '#6B655C',
  line: '#E2D6C5',
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Subjects are headers: strip CR/LF so nothing can inject a new header line. */
function subjectSafe(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/** `@db.Date` is 00:00 UTC of the calendar day; format in UTC so it never shifts. */
/** "Sat 12 Dec" for subject lines. eventDate is a UTC calendar date. */
function shortEventDate(d: Date): string {
  return d
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })
    .replace(',', '');
}

export function formatEventDate(d: Date): string {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function formatHoldUntil(d: Date): string {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

/** Paragraph from trusted copy plus already-escaped fragments. */
function p(html: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${C.ink};">${html}</p>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:999px;background:${C.ember};"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:bold;color:${C.cream};text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a></td></tr></table>`;
}

type Row = [label: string, value: string | null | undefined];

function summaryRows(b: CateringBooking): Row[] {
  return [
    ['Reference', b.reference],
    ['Date', formatEventDate(b.eventDate)],
    ['Delivery time', b.serviceTime],
    ['Package', b.packageName],
    ['Pax', String(b.guests)],
    ['Occasion', b.occasion],
    ['Total', b.quoteAmount != null ? `RM ${b.quoteAmount.toFixed(2)}` : null],
    [
      b.paymentChoice === 'FULL' ? 'To pay (in full)' : 'To pay now (half)',
      b.depositAmount != null ? `RM ${b.depositAmount.toFixed(2)}` : null,
    ],
    ['Delivery address', b.eventAddress],
  ];
}

function table(rows: Row[]): string {
  const body = rows
    .filter(([, v]) => v != null && v !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px 8px 0;font-size:13px;color:${C.muted};vertical-align:top;white-space:nowrap;border-bottom:1px solid ${C.line};">${escapeHtml(k)}</td><td style="padding:8px 0;font-size:14px;color:${C.ink};vertical-align:top;border-bottom:1px solid ${C.line};">${escapeHtml(v)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-collapse:collapse;">${body}</table>`;
}

function tableText(rows: Row[]): string {
  return rows
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

function layout(innerHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${C.cream};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.cream};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:${C.night};padding:20px 24px;font-size:18px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${C.cream};">BAKAR &amp; ROAST</td></tr>
<tr><td style="background:${C.cream};padding:28px 24px 8px;">${innerHtml}</td></tr>
<tr><td style="padding:16px 24px 24px;border-top:1px solid ${C.line};font-size:12px;line-height:1.6;color:${C.muted};">Fire. Feast. Family.<br>Petaling Jaya, Kuala Lumpur</td></tr>
</table></td></tr></table></body></html>`;
}

const FOOTER_TEXT = '\n\nFire. Feast. Family.\nPetaling Jaya, Kuala Lumpur';

interface Part {
  html: string;
  text: string;
}

/** Copy is trusted; every value interpolated must already be escaped by the caller. */
const para = (html: string, text: string): Part => ({ html: p(html), text });
const cta = (href: string, label: string): Part => ({
  html: button(href, label),
  text: `${label}: ${href}`,
});
const summary = (rows: Row[]): Part => ({
  html: table(rows),
  text: tableText(rows),
});

function build(subject: string, parts: Part[]): EmailContent {
  return {
    subject: subjectSafe(subject),
    html: layout(parts.map((x) => x.html).join('')),
    text: parts.map((x) => x.text).join('\n\n') + FOOTER_TEXT,
  };
}

function hi(b: CateringBooking): Part {
  return para(`Hi ${escapeHtml(b.customerName)},`, `Hi ${b.customerName},`);
}

const statusLink = (site: string, b: CateringBooking) =>
  `${site}/booking/${b.accessToken}`;
const adminLink = (site: string, b: CateringBooking) =>
  `${site}/admin/bookings/${b.id}`;

export function bookingReceivedEmail(
  b: CateringBooking,
  site: string,
): EmailContent {
  const hold = b.holdExpiresAt
    ? para(
        `We are holding your date until <strong>${escapeHtml(formatHoldUntil(b.holdExpiresAt))}</strong>.`,
        `We are holding your date until ${formatHoldUntil(b.holdExpiresAt)}.`,
      )
    : para(
        'We are holding your date for now.',
        'We are holding your date for now.',
      );
  return build(`We have your request, ${b.reference}`, [
    hi(b),
    para(
      'Thanks for choosing us. We have your catering request and we will call you soon to talk it through.',
      'Thanks for choosing us. We have your catering request and we will call you soon to talk it through.',
    ),
    hold,
    summary(summaryRows(b)),
    cta(statusLink(site, b), 'View your request'),
  ]);
}

export function ownerNewRequestEmail(
  b: CateringBooking,
  site: string,
): EmailContent {
  const date = formatEventDate(b.eventDate);
  const rows: Row[] = [
    ...summaryRows(b),
    ['Customer', b.customerName],
    ['Phone', b.customerPhone],
    ['Email', b.customerEmail],
    ['Dietary', b.dietaryNotes],
    ['Notes', b.notes],
  ];
  const parts: Part[] = [
    para(
      `New catering request for <strong>${escapeHtml(date)}</strong>. The date is on hold until you approve or decline.`,
      `New catering request for ${date}. The date is on hold until you approve or decline.`,
    ),
  ];
  if (b.holdExpiresAt) {
    parts.push(
      para(
        `The hold ends ${escapeHtml(formatHoldUntil(b.holdExpiresAt))}.`,
        `The hold ends ${formatHoldUntil(b.holdExpiresAt)}.`,
      ),
    );
  }
  parts.push(summary(rows), cta(adminLink(site, b), 'Open booking'));
  return build(`New request for ${shortEventDate(b.eventDate)}`, parts);
}

/** Owner: the customer uploaded a payment receipt. */
export function ownerReceiptUploadedEmail(
  b: CateringBooking,
  site: string,
): EmailContent {
  const date = formatEventDate(b.eventDate);
  return build(`Receipt for ${b.reference}`, [
    para(
      `${escapeHtml(b.customerName)} uploaded a payment receipt for <strong>${escapeHtml(date)}</strong>. Check it, then approve the booking.`,
      `${b.customerName} uploaded a payment receipt for ${date}. Check it, then approve the booking.`,
    ),
    summary(summaryRows(b)),
    cta(adminLink(site, b), 'Open booking'),
  ]);
}

export function bookingApprovedEmail(
  b: CateringBooking,
  site: string,
): EmailContent {
  return build('Your date is confirmed', [
    hi(b),
    para(
      'Good news. Your date is confirmed. We will bring the fire.',
      'Good news. Your date is confirmed. We will bring the fire.',
    ),
    summary(summaryRows(b)),
    cta(statusLink(site, b), 'View your booking'),
  ]);
}

export function bookingDeclinedEmail(
  b: CateringBooking,
  site: string,
): EmailContent {
  const reason = b.declineReason?.trim();
  const parts: Part[] = [
    hi(b),
    para(
      'Thank you for asking us. We are sorry, but we cannot take this booking.',
      'Thank you for asking us. We are sorry, but we cannot take this booking.',
    ),
  ];
  if (reason) {
    parts.push(
      para(
        `<strong>Note from us:</strong> ${escapeHtml(reason)}`,
        `Note from us: ${reason}`,
      ),
    );
  }
  parts.push(
    para(
      'We would love to cook for you another time.',
      'We would love to cook for you another time.',
    ),
    summary(summaryRows(b)),
    cta(`${site}/catering/book`, 'Pick another date'),
  );
  return build('About your request', parts);
}

export function bookingCancelledEmail(
  b: CateringBooking,
  site: string,
): EmailContent {
  return build('Your booking is cancelled', [
    hi(b),
    para(
      'Your booking is cancelled and the date has been released.',
      'Your booking is cancelled and the date has been released.',
    ),
    summary(summaryRows(b)),
    cta(`${site}/catering/book`, 'Book a new date'),
  ]);
}

export function bookingExpiredEmail(
  b: CateringBooking,
  site: string,
): EmailContent {
  return build('We could not confirm in time', [
    hi(b),
    para(
      'We could not confirm your request in time, so the date has been released. We are sorry about that.',
      'We could not confirm your request in time, so the date has been released. We are sorry about that.',
    ),
    para(
      'If you still want us there, please book again.',
      'If you still want us there, please book again.',
    ),
    summary(summaryRows(b)),
    cta(`${site}/catering/book`, 'Book again'),
  ]);
}

export function ownerCustomerCancelledEmail(
  b: CateringBooking,
  site: string,
): EmailContent {
  const date = formatEventDate(b.eventDate);
  return build(`${b.reference} was cancelled`, [
    para(
      `${escapeHtml(b.customerName)} cancelled their booking. <strong>${escapeHtml(date)}</strong> is free again.`,
      `${b.customerName} cancelled their booking. ${date} is free again.`,
    ),
    summary([
      ...summaryRows(b),
      ['Phone', b.customerPhone],
      ['Email', b.customerEmail],
    ]),
    cta(adminLink(site, b), 'Open booking'),
  ]);
}

export function signInCodeEmail(otp: string): EmailContent {
  const code = escapeHtml(otp);
  return build(`Your Bakar & Roast code: ${otp}`, [
    para('Here is your code:', 'Here is your code:'),
    {
      html: `<p style="margin:0 0 24px;font-size:36px;font-weight:bold;letter-spacing:8px;color:${C.ink};">${code}</p>`,
      text: otp,
    },
    para(
      'This code expires in 5 minutes. If you did not ask for it, ignore this email.',
      'This code expires in 5 minutes. If you did not ask for it, ignore this email.',
    ),
  ]);
}
