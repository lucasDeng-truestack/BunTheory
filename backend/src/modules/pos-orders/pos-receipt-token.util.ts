import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

function secret(): string {
  return (
    process.env.POS_RECEIPT_TOKEN_SECRET?.trim() ||
    'dev-pos-receipt-secret-change-me'
  );
}

const TOKEN_TTL_SEC = 60 * 60 * 24 * 90; /** 90 days */

function timingSafeCompare(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export interface PosReceiptClaim {
  oid: string;
  tip: number;
}

export function issuePosReceiptToken(orderId: string, tipRm: number): string {
  if (!orderId.trim()) throw new BadRequestException('Invalid order reference');
  const tip = Number.isFinite(tipRm) && tipRm > 0 ? Math.round(tipRm * 100) / 100 : 0;
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const payloadRaw = JSON.stringify({ oid: orderId.trim(), exp, tip });
  const sig = crypto
    .createHmac('sha256', secret())
    .update(payloadRaw)
    .digest('base64url');
  const encoded = Buffer.from(payloadRaw).toString('base64url');
  return `${encoded}.${sig}`;
}

export function verifyPosReceiptToken(fullToken: string): PosReceiptClaim {
  /**
   * E-receipt: exactly two segments (JSON payload signed with HMAC).
   * Typical login JWT has three segments (header.payload.sig) — reject with a clearer hint.
   */
  const segments = fullToken.split('.');
  if (segments.length !== 2) {
    if (segments.length === 3) {
      throw new UnauthorizedException(
        'This URL is staff login credentials, not a receipt. Scan the QR on the Receipt ready screen after checkout.',
      );
    }
    throw new UnauthorizedException('Invalid receipt link');
  }
  const encoded = segments[0]!;
  const sig = segments[1]!;
  if (!encoded?.trim() || !sig?.trim()) {
    throw new UnauthorizedException('Invalid receipt link');
  }
  let payloadRaw: string;
  try {
    payloadRaw = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    throw new UnauthorizedException('Invalid receipt link');
  }
  const expectedSig = crypto
    .createHmac('sha256', secret())
    .update(payloadRaw)
    .digest('base64url');
  if (!timingSafeCompare(expectedSig, sig)) {
    throw new UnauthorizedException('Invalid receipt link');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadRaw);
  } catch {
    throw new UnauthorizedException('Invalid receipt link');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).oid !== 'string' ||
    typeof (parsed as Record<string, unknown>).exp !== 'number'
  ) {
    throw new UnauthorizedException('Invalid receipt link');
  }
  const o = parsed as { oid: string; exp: number; tip?: number };
  const nowSec = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(o.exp) || o.exp < nowSec) {
    throw new BadRequestException('This receipt link has expired');
  }
  const tip =
    typeof o.tip === 'number' &&
    Number.isFinite(o.tip) &&
    o.tip >= 0 &&
    o.tip <= 999_999.99
      ? Math.round(o.tip * 100) / 100
      : 0;

  return { oid: o.oid.trim(), tip };
}
