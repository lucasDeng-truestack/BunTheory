"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, PencilLine, ShieldCheck } from "lucide-react";
import {
  createTeamMember,
  listTeam,
  updateTeamMemberName,
  updateTeamMemberPassword,
  type TeamMember,
  type TeamMemberSaved,
} from "@/lib/bun-theory-api";
import type { AdminUser } from "@/lib/catering-api";
import { initials, isEmailShape } from "@/lib/admin";
import { Banner, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminPage, describeError, LoadError } from "@/components/admin/admin-page";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { Block, type Notice } from "@/components/admin/bun-theory/order-parts";

const ROLE_LABELS: Record<AdminUser["role"], string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  KITCHEN: "Kitchen",
  CASHIER: "Cashier",
};

/** Same limits as the backend DTOs (backend/src/modules/auth/dto). */
const PASSWORD_MIN = 6;
const NAME_MAX = 80;

const addedOn = (at: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(at));

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

type Editing = { id: string; kind: "name" | "password" } | null;

/**
 * Staff accounts for the whole admin: list, add, rename, set a password. Roles are shown, not
 * edited (they come later). Anyone signed in sees every action, as before; the server decides
 * who may change whom and its refusal shows as a Banner.
 */
export function TeamScreen() {
  const { admin } = useAdmin();
  const q = useAdminQuery(listTeam, []);
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const replace = (m: TeamMemberSaved) => q.setData((list) => list?.map((x) => (x.id === m.id ? { ...x, ...m } : x)));

  return (
    <AdminPage title="Team" lead="Everyone who can sign in to this admin.">
      {q.data === undefined ? (
        q.error ? (
          <LoadError onRetry={q.reload} />
        ) : (
          <TeamSkeleton />
        )
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
          <section className="grid min-w-0 content-start gap-3" aria-labelledby="team-list">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="team-list" className="m-0 text-lg font-bold">
                {plural(q.data.length, "account")}
              </h2>
              <span className="text-[13px] text-cream-muted">Roles are set later.</span>
            </div>
            {q.error ? <LoadError onRetry={q.reload} /> : null}
            {notice && (
              <Banner tone={notice.tone} title={notice.title}>
                {notice.help}
              </Banner>
            )}
            <ul className="m-0 grid list-none gap-2 p-0">
              {q.data.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  self={m.id === admin.id}
                  editing={editing?.id === m.id ? editing.kind : null}
                  onEdit={(kind) => {
                    setNotice(null);
                    setEditing(kind ? { id: m.id, kind } : null);
                  }}
                  onDone={(updated, n) => {
                    if (updated) replace(updated);
                    setEditing(null);
                    setNotice(n);
                  }}
                />
              ))}
            </ul>
          </section>
          <AddMember
            onStart={() => setNotice(null)}
            onAdded={(m) => {
              // The server's reply has no role: reload the list so the new member shows theirs.
              void q.reload();
              setNotice({ tone: "ok", title: `${m.email} can sign in now.`, help: "Share the password with them in person or by message." });
            }}
          />
        </div>
      )}
    </AdminPage>
  );
}

function MemberRow({
  member: m,
  self,
  editing,
  onEdit,
  onDone,
}: {
  member: TeamMember;
  self: boolean;
  editing: "name" | "password" | null;
  onEdit: (kind: "name" | "password" | null) => void;
  onDone: (updated: TeamMemberSaved | null, notice: Notice) => void;
}) {
  const name = m.displayName?.trim() || m.email;
  return (
    <li className="grid gap-3 rounded-card-sm bg-ink-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-[1_1_240px] items-center gap-3">
          <span aria-hidden className="grid h-11 w-11 flex-none place-items-center rounded-full bg-ink-line text-sm font-bold">
            {initials(m.displayName, m.email)}
          </span>
          <span className="grid min-w-0 gap-0.5">
            <b className="text-base [overflow-wrap:anywhere]">
              {name}
              {self && <span className="ml-2 text-[13px] font-normal text-cream-muted">(you)</span>}
            </b>
            {m.displayName?.trim() && <span className="text-[13px] text-cream-muted [overflow-wrap:anywhere]">{m.email}</span>}
            <span className="text-[13px] text-cream-faint">Added {addedOn(m.createdAt)}</span>
          </span>
        </div>
        <span className="type-admin-meta inline-flex h-7 flex-none items-center gap-1.5 rounded-full border border-cream-faint pl-2 pr-2.5 text-cream">
          <ShieldCheck aria-hidden size={14} strokeWidth={1.75} />
          <span className="sr-only">Role: </span>
          {ROLE_LABELS[m.role] ?? m.role}
        </span>
      </div>
      {editing === null && (
        <div className="flex flex-wrap gap-2 border-t border-ink-line pt-3">
          <Button size="sm" variant="ghost" onClick={() => onEdit("name")} aria-label={`Rename ${name}`}>
            <span className="inline-flex items-center gap-2">
              <PencilLine aria-hidden size={16} strokeWidth={1.75} />
              Rename
            </span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit("password")} aria-label={`Change the password for ${name}`}>
            <span className="inline-flex items-center gap-2">
              <KeyRound aria-hidden size={16} strokeWidth={1.75} />
              Change password
            </span>
          </Button>
        </div>
      )}
      {editing === "name" && <RenameForm member={m} self={self} onCancel={() => onEdit(null)} onDone={onDone} />}
      {editing === "password" && <PasswordForm member={m} self={self} onCancel={() => onEdit(null)} onDone={onDone} />}
    </li>
  );
}

function RenameForm({
  member: m,
  self,
  onCancel,
  onDone,
}: {
  member: TeamMember;
  self: boolean;
  onCancel: () => void;
  onDone: (updated: TeamMemberSaved | null, notice: Notice) => void;
}) {
  const { run } = useAdmin();
  const [value, setValue] = useState(m.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<Notice>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFailed(null);
    try {
      const updated = await run((t) => updateTeamMemberName(t, m.id, value.trim()));
      onDone(updated, {
        tone: "ok",
        title: value.trim() ? `Renamed to ${value.trim()}.` : `Name cleared. ${m.email} shows instead.`,
        help: self ? "The menu shows your new name the next time you sign in." : undefined,
      });
    } catch (err) {
      setFailed({ tone: "error", ...describeError(err) });
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3 border-t border-ink-line pt-3">
      <Field
        size="sm"
        label="Display name"
        optional
        autoFocus
        autoComplete="off"
        maxLength={NAME_MAX}
        value={value}
        help="Empty shows the email instead."
        onChange={(e) => setValue(e.target.value)}
      />
      {failed && (
        <Banner tone="error" title={failed.title}>
          {failed.help}
        </Banner>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="cream" type="submit" loading={saving} loadingLabel="Saving">
          Save name
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function PasswordForm({
  member: m,
  self,
  onCancel,
  onDone,
}: {
  member: TeamMember;
  self: boolean;
  onCancel: () => void;
  onDone: (updated: TeamMemberSaved | null, notice: Notice) => void;
}) {
  const { run } = useAdmin();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<Notice>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFailed(null);
    // The old screen's rules: trimmed, at least 6, both the same.
    const p = password.trim();
    const c = confirm.trim();
    const next: typeof errors = {};
    if (p.length < PASSWORD_MIN) next.password = `Use at least ${PASSWORD_MIN} characters.`;
    if (!next.password && p !== c) next.confirm = "The two passwords do not match.";
    setErrors(next);
    if (next.password || next.confirm) return;
    setSaving(true);
    try {
      const updated = await run((t) => updateTeamMemberPassword(t, m.id, { password: p, confirmPassword: c }));
      onDone(updated, {
        tone: "ok",
        title: "Password changed.",
        help: self ? "Your other devices are signed out. This one stays signed in." : `${m.email} is signed out everywhere and signs in with the new one.`,
      });
    } catch (err) {
      setFailed({ tone: "error", ...describeError(err) });
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 border-t border-ink-line pt-3">
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <Field
          size="sm"
          type="password"
          label="New password"
          autoFocus
          autoComplete="new-password"
          value={password}
          error={errors.password}
          help={`At least ${PASSWORD_MIN} characters.`}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          size="sm"
          type="password"
          label="Type it again"
          autoComplete="new-password"
          value={confirm}
          error={errors.confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <p className="m-0 text-[13px] text-cream-muted">
        {self ? "Your other devices will be signed out." : "They will be signed out on every device."}
      </p>
      {failed && (
        <Banner tone="error" title={failed.title}>
          {failed.help}
        </Banner>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="cream" type="submit" loading={saving} loadingLabel="Saving">
          Save password
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

type AddErrors = Partial<Record<"email" | "password", string>>;

function AddMember({ onStart, onAdded }: { onStart: () => void; onAdded: (m: TeamMemberSaved) => void }) {
  const { run } = useAdmin();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<AddErrors>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<Notice>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFailed(null);
    onStart();
    const mail = email.trim().toLowerCase();
    const pass = password.trim();
    const next: AddErrors = {};
    if (!mail) next.email = "Enter their email.";
    else if (!isEmailShape(mail)) next.email = "Enter an email like name@example.com.";
    if (pass.length < PASSWORD_MIN) next.password = `Use at least ${PASSWORD_MIN} characters.`;
    setErrors(next);
    if (next.email || next.password) return;
    setSaving(true);
    try {
      const created = await run((t) =>
        createTeamMember(t, { email: mail, password: pass, ...(name.trim() ? { displayName: name.trim() } : {}) }),
      );
      setName("");
      setEmail("");
      setPassword("");
      onAdded(created);
    } catch (err) {
      setFailed({ tone: "error", ...describeError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Block title="Add a team member" className="xl:sticky xl:top-6">
      <form onSubmit={submit} noValidate className="grid gap-3">
        <Field
          size="sm"
          label="Name"
          optional
          autoComplete="off"
          maxLength={NAME_MAX}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          size="sm"
          type="email"
          inputMode="email"
          label="Email"
          autoComplete="off"
          placeholder="name@example.com"
          value={email}
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          size="sm"
          type="password"
          label="Password"
          autoComplete="new-password"
          value={password}
          error={errors.password}
          help={`At least ${PASSWORD_MIN} characters. Set it now and share it with them.`}
          onChange={(e) => setPassword(e.target.value)}
        />
        {failed && (
          <Banner tone="error" title={failed.title}>
            {failed.help}
          </Banner>
        )}
        <div>
          <Button size="sm" variant="ember" type="submit" loading={saving} loadingLabel="Adding">
            Add member
          </Button>
        </div>
        <p className="m-0 text-[13px] text-cream-muted">They can sign in straight away.</p>
      </form>
    </Block>
  );
}

function TeamSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
      <div className="grid gap-2">
        <Skeleton className="h-6 w-40" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[132px]" />
        ))}
      </div>
      <Skeleton className="h-[380px]" />
    </div>
  );
}
