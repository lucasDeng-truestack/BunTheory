export interface AdminLike {
  email: string;
  displayName?: string | null;
}

/** Primary label shown in shell and settings (never the word "Staff"). */
export function adminDisplayLabel(a: AdminLike | null | undefined): string {
  if (!a) return '';
  const n = a.displayName?.trim();
  if (n) return n;
  const local = a.email.split('@')[0]?.trim();
  return local || a.email;
}

export function adminAvatarInitial(a: AdminLike | null | undefined): string {
  const label = adminDisplayLabel(a).trim();
  if (!label) return 'A';
  return label.charAt(0).toUpperCase();
}
