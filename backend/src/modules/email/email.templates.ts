import { CateringBooking } from '@prisma/client';
import { SHOP_WHATSAPP_DEFAULT } from '../shop/shop.config';

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

/**
 * The header of every email: the logo, served by the public site. Mail apps cannot load an image
 * from localhost, so without a real https site URL it stays as text. The alt text is the name,
 * styled by the cell around it, so it still reads right when a mail app blocks images.
 */
function brandMark(): string {
  const site = (process.env.PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (!/^https:\/\//i.test(site)) return 'BAKAR &amp; ROAST';
  return `<img src="${escapeHtml(site)}/images/logo-email.png" width="150" height="119" alt="BAKAR &amp; ROAST" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:150px;color:${C.cream};">`;
}

/** Which site an email is from. The Bun Theory gets its own name in the header and footer. */
export type EmailBrand = 'bakar-roast' | 'bun-theory';

function layout(innerHtml: string, brand: EmailBrand = 'bakar-roast'): string {
  const bun = brand === 'bun-theory';
  return `<!doctype html><html><body style="margin:0;padding:0;background:${C.cream};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.cream};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:${C.night};padding:20px 24px;font-size:18px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${C.cream};">${bun ? 'THE BUN THEORY' : brandMark()}</td></tr>
<tr><td style="background:${C.cream};padding:28px 24px 8px;">${innerHtml}</td></tr>
<tr><td style="padding:16px 24px 24px;border-top:1px solid ${C.line};font-size:12px;line-height:1.6;color:${C.muted};">${bun ? 'The Bun Theory by Bakar &amp; Roast' : 'Real Smoke, Bold Flavours.'}<br>Petaling Jaya, Kuala Lumpur</td></tr>
</table></td></tr></table></body></html>`;
}

const FOOTER_TEXT = '\n\nReal Smoke, Bold Flavours.\nPetaling Jaya, Kuala Lumpur';

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

function build(subject: string, parts: Part[]): EmailContent;
function build(subject: string, brand: EmailBrand, parts: Part[]): EmailContent;
function build(subject: string, a: EmailBrand | Part[], b?: Part[]): EmailContent {
  const brand: EmailBrand = typeof a === 'string' ? a : 'bakar-roast';
  const parts = typeof a === 'string' ? (b ?? []) : a;
  const footer =
    brand === 'bun-theory'
      ? '\n\nThe Bun Theory by Bakar & Roast\nPetaling Jaya, Kuala Lumpur'
      : FOOTER_TEXT;
  return {
    subject: subjectSafe(subject),
    html: layout(parts.map((x) => x.html).join(''), brand),
    text: parts.map((x) => x.text).join('\n\n') + footer,
  };
}

function hi(b: CateringBooking): Part {
  return para(`Hi ${escapeHtml(b.customerName)},`, `Hi ${b.customerName},`);
}

/**
 * Catering has no customer booking page and no admin screen any more (the site sells through
 * /order). Customer emails point to WhatsApp, quoting the reference, and to /order; owner emails
 * point to the admin home.
 */
/**
 * WhatsApp links go through the site's /wa page, which sends the reader on to whatever business
 * number the owner has saved in the admin. Without a real site URL, the built-in number is used.
 */
// Read when an email is built, not when this file loads: the .env file is not loaded that early.
const whatsappBase = () => {
  const site = (process.env.PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  return /^https:\/\//i.test(site) ? `${site}/wa` : `https://wa.me/${SHOP_WHATSAPP_DEFAULT}`;
};
const whatsappLink = (b: CateringBooking) =>
  `${whatsappBase()}?text=${encodeURIComponent(`Hi Bakar & Roast, about my catering booking ${b.reference}.`)}`;
const orderLink = (site: string) => `${site}/order`;
const adminLink = (_site: string, _b: CateringBooking) =>
  `${(process.env.ADMIN_URL?.trim() || 'http://localhost:3300').replace(/\/+$/, '')}/admin`;

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
    cta(whatsappLink(b), 'Message us on WhatsApp'),
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
      `${escapeHtml(b.customerName)} uploaded a payment receipt for <strong>${escapeHtml(date)}</strong>, so the booking is confirmed. Check the money is in your bank and tick Payment received. If it is not there, or you cannot make it, cancel the booking.`,
      `${b.customerName} uploaded a payment receipt for ${date}, so the booking is confirmed. Check the money is in your bank and tick Payment received. If it is not there, or you cannot make it, cancel the booking.`,
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
    cta(whatsappLink(b), 'Message us on WhatsApp'),
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
    cta(orderLink(site), 'Order online'),
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
    cta(orderLink(site), 'Order online'),
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
      'If you still want us there, message us on WhatsApp, or order online.',
      'If you still want us there, message us on WhatsApp, or order online.',
    ),
    summary(summaryRows(b)),
    cta(orderLink(site), 'Order online'),
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

export function signInCodeEmail(otp: string, brand: EmailBrand = 'bakar-roast'): EmailContent {
  const code = escapeHtml(otp);
  const name = brand === 'bun-theory' ? 'Bun Theory' : 'Bakar & Roast';
  return build(`Your ${name} code: ${otp}`, brand, [
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
