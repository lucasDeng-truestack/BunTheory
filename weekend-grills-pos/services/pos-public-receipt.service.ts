import { fetchPublicJson } from '@/lib/api';
import type { PublicPosReceipt } from '@/types/pos';

export function fetchPublicReceipt(token: string) {
  const q = new URLSearchParams({ token });
  return fetchPublicJson<PublicPosReceipt>(
    `/pos/public/receipt?${q.toString()}`,
  );
}
