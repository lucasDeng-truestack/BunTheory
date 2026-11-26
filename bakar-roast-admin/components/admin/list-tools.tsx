"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { ApiError } from "@/lib/api";
import { adminUploadImage } from "@/lib/catering-api";
import { moveItem, UPLOAD_ACCEPT, UPLOAD_RULE, uploadProblem } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/components/admin/admin-context";
import { describeError } from "@/components/admin/admin-page";

// Shared by Packages and Gallery and testimonials: one-at-a-time saves, order arrows, photo upload.

/** Run writes one at a time, so an older response can never land after a newer one. */
export function useSerial() {
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  return useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(fn);
    queue.current = next.catch(() => {});
    return next;
  }, []);
}

/**
 * Move a row one place: the list changes at once, then each changed sortOrder is sent in turn.
 * On a failure the list goes back and reloads from the server (one of two writes may have landed).
 */
export function useReorder<T extends { id: string; sortOrder: number }>({
  list,
  setList,
  send,
  onFail,
  reload,
}: {
  list: T[];
  setList: (list: T[]) => void;
  send: (token: string, id: string, sortOrder: number) => Promise<unknown>;
  onFail: (err: unknown) => void;
  reload: () => void;
}) {
  const { run } = useAdmin();
  const serial = useSerial();
  return async (index: number, dir: -1 | 1) => {
    const moved = moveItem(list, index, dir);
    if (!moved) return;
    setList(moved.list);
    try {
      for (const u of moved.updates) await serial(() => run((t) => send(t, u.id, u.sortOrder)));
    } catch (err) {
      setList(list);
      onFail(err);
      reload();
    }
  };
}

export const iconBtn =
  "grid h-11 w-11 flex-none place-items-center rounded-full border border-cream-faint text-cream transition-colors hover:border-cream disabled:cursor-not-allowed disabled:border-ink-line disabled:text-cream-faint";

/** Up and down (or earlier and later) arrows. Focus stays on the arrow as the row moves. */
export function OrderArrows({
  name,
  first,
  last,
  onMove,
  sideways = false,
}: {
  /** What moves, for the labels: "The Feast", "photo 2". */
  name: string;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  sideways?: boolean;
}) {
  const up = useRef<HTMLButtonElement>(null);
  const down = useRef<HTMLButtonElement>(null);
  const move = (dir: -1 | 1) => {
    onMove(dir);
    // The row's DOM moves, which drops focus: put it back (on the other arrow at the ends).
    requestAnimationFrame(() => {
      const mine = dir === -1 ? up.current : down.current;
      const other = dir === -1 ? down.current : up.current;
      (mine && !mine.disabled ? mine : other)?.focus();
    });
  };
  const [Back, Fwd] = sideways ? [ArrowLeft, ArrowRight] : [ArrowUp, ArrowDown];
  const [backWord, fwdWord] = sideways ? ["earlier", "later"] : ["up", "down"];
  return (
    <span className="flex gap-2">
      <button ref={up} type="button" className={iconBtn} aria-label={`Move ${name} ${backWord}`} disabled={first} onClick={() => move(-1)}>
        <Back aria-hidden size={16} strokeWidth={1.75} />
      </button>
      <button ref={down} type="button" className={iconBtn} aria-label={`Move ${name} ${fwdWord}`} disabled={last} onClick={() => move(1)}>
        <Fwd aria-hidden size={16} strokeWidth={1.75} />
      </button>
    </span>
  );
}

export type UploadResult = { url: string } | { error: string };

/** Check a picked photo in the browser, then upload it. run() handles a 401 like any other call. */
export function useUpload() {
  const { run } = useAdmin();
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File): Promise<UploadResult> => {
    const problem = uploadProblem(file);
    if (problem) return { error: problem };
    setUploading(true);
    try {
      return await run((t) => adminUploadImage(t, file));
    } catch (err) {
      // A 400 is the file; anything else (role, server, network) says so in its own words.
      return {
        error:
          err instanceof ApiError && err.status === 400
            ? `That photo did not upload. ${UPLOAD_RULE}`
            : describeError(err).title,
      };
    } finally {
      setUploading(false);
    }
  };
  return { upload, uploading };
}

/** A button that opens the photo picker (JPG, PNG, WebP). */
export function PhotoPicker({
  onFile,
  uploading,
  children,
  variant = "ghost",
  className,
  describedBy,
}: {
  onFile: (file: File) => void;
  uploading: boolean;
  children: ReactNode;
  variant?: "ghost" | "ember" | "cream";
  className?: string;
  describedBy?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={UPLOAD_ACCEPT}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
      <Button
        size="sm"
        variant={variant}
        loading={uploading}
        loadingLabel="Uploading"
        aria-describedby={describedBy}
        onClick={() => {
          if (!uploading) input.current?.click();
        }}
        className={cn(className)}
      >
        {children}
      </Button>
    </>
  );
}
