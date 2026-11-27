"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  shopAdminGetContactSettings,
  shopAdminUpdateSettings,
  type ShopContactSettings,
} from "@/lib/shop-api";
import { imageSrc } from "@/lib/catering-api";
import { localUploadPath } from "@/lib/bun-theory";
import { brand } from "@/lib/content";
import { isSessionGone } from "@/lib/admin-session";
import { cn } from "@/lib/utils";
import { Banner, ErrorMark } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useAdmin } from "@/components/admin/admin-context";
import { describeError } from "@/components/admin/admin-page";
import { PhotoPicker, useUpload } from "@/components/admin/list-tools";
import { railRow, SettingsRail } from "@/components/admin/settings-rail";
import { Block, type Notice } from "@/components/admin/bun-theory/order-parts";

/** The form as typed. */
type Draft = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrUrl: string;
  whatsapp: string;
};

/** "601175126433" -> "+60 11-7512 6433", as the customer site shows it. */
function showPhone(digits: string | null): string {
  if (!digits) return "";
  const m = /^60(\d{2})(\d{3,4})(\d{4})$/.exec(digits);
  return m ? `+60 ${m[1]}-${m[2]} ${m[3]}` : `+${digits}`;
}

const toDraft = (s: ShopContactSettings): Draft => ({
  bankName: s.cateringBankName ?? "",
  accountName: s.cateringBankAccountName ?? "",
  accountNumber: s.cateringBankAccountNumber ?? "",
  qrUrl: s.cateringPaymentQrUrl ?? "",
  whatsapp: showPhone(s.shopWhatsappNumber),
});

const same = (a: Draft, b: Draft) =>
  (Object.keys(a) as (keyof Draft)[]).every((k) => a[k].trim() === b[k].trim());

export type ShopSettingsSection = "payment" | "contact";

/** What the Settings tabs show for this brand: edits waiting, and no saved way to pay. */
export type ShopSettingsStatus = { dirty: boolean; noPay: boolean };

/**
 * Where Bakar & Roast customers pay and how they reach the business: bank details and the
 * payment QR shown on every unpaid order (Payment), and the WhatsApp number behind every
 * "message us" link (Contact). One draft covers both sections and both stay mounted, so
 * switching between them keeps what was typed. Nothing saves until Save is pressed.
 */
export function ShopSettingsForm({
  initial,
  section,
  onSection,
  onStatus,
}: {
  initial: ShopContactSettings;
  section: ShopSettingsSection;
  /** Asked for when a field in the other section needs the owner (a WhatsApp number that will not save). */
  onSection: (section: ShopSettingsSection) => void;
  onStatus: (status: ShopSettingsStatus) => void;
}) {
  const { run } = useAdmin();
  const { upload, uploading } = useUpload();
  const [base, setBase] = useState(() => toDraft(initial));
  const [d, setD] = useState(base);
  const [notice, setNotice] = useState<Notice>(null);
  const [phoneError, setPhoneError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = !same(d, base);
  const savedNoPay = !base.accountNumber.trim() && !base.qrUrl.trim();

  useEffect(() => onStatus({ dirty, noPay: savedNoPay }), [dirty, savedNoPay, onStatus]);

  const set = (patch: Partial<Draft>) => {
    setD((cur) => ({ ...cur, ...patch }));
    setNotice(null);
    if ("whatsapp" in patch) setPhoneError("");
  };

  const onQr = async (file: File) => {
    setUploadError("");
    const res = await upload(file);
    if ("error" in res) setUploadError(res.error);
    else set({ qrUrl: res.url });
  };

  const save = async () => {
    if (uploading) {
      setNotice({ tone: "error", title: "The QR is still uploading.", help: "Save again when it shows." });
      return;
    }
    const digits = d.whatsapp.replace(/\D/g, "");
    if (d.whatsapp.trim() && (digits.length < 9 || digits.length > 15)) {
      setPhoneError("Enter the number in full, like 011-7512 6433.");
      onSection("contact");
      // The field is in the Contact section: focus it once that section shows.
      requestAnimationFrame(() => document.getElementById("pay-whatsapp")?.focus());
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await run((t) =>
        shopAdminUpdateSettings(t, {
          shopBankName: d.bankName.trim(),
          shopBankAccountName: d.accountName.trim(),
          shopBankAccountNumber: d.accountNumber.trim(),
          shopPaymentQrUrl: d.qrUrl.trim(),
          shopWhatsappNumber: d.whatsapp.trim(),
        }),
      );
      // Read back what was stored, so the number shows in its saved form.
      const fresh = toDraft(await run((t) => shopAdminGetContactSettings(t)));
      setBase(fresh);
      setD(fresh);
      setNotice({ tone: "ok", title: "Saved.", help: "Unpaid orders show the new payment details right away. WhatsApp links on the site follow within a minute." });
    } catch (err) {
      if (!isSessionGone(err)) setNotice({ tone: "error", ...describeError(err) });
    } finally {
      setSaving(false);
    }
  };

  const qr = imageSrc(localUploadPath(d.qrUrl));
  const nothingToPayWith = !d.accountNumber.trim() && !d.qrUrl.trim();

  return (
    <>
      {notice && (
        <Banner tone={notice.tone} title={notice.title}>
          {notice.help}
        </Banner>
      )}
      {section === "payment" && nothingToPayWith && (
        <Banner tone="error" title="Customers have nowhere to pay yet.">
          Add an account number or a QR. Until then, the order page asks them to message you for payment details.
        </Banner>
      )}

      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className={cn("grid min-w-0 content-start gap-4", section !== "payment" && "hidden")}>
          <Block title="Bank transfer">
            <Field
              size="sm"
              label="Bank"
              optional
              placeholder="Maybank"
              autoComplete="off"
              maxLength={80}
              value={d.bankName}
              onChange={(e) => set({ bankName: e.target.value })}
            />
            <Field
              size="sm"
              label="Account name"
              optional
              placeholder="Bakar & Roast Enterprise"
              autoComplete="off"
              maxLength={120}
              help="The name customers see in their banking app when they transfer."
              value={d.accountName}
              onChange={(e) => set({ accountName: e.target.value })}
            />
            <Field
              size="sm"
              label="Account number"
              optional
              inputMode="numeric"
              autoComplete="off"
              maxLength={40}
              value={d.accountNumber}
              onChange={(e) => set({ accountNumber: e.target.value })}
              className="max-w-[320px]"
            />
          </Block>

          <Block title="Payment QR">
            {qr ? (
              <div className="grid justify-items-start gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- an owner upload, from any storage host */}
                <img
                  src={qr}
                  alt="The payment QR customers scan"
                  className="h-56 w-56 rounded-card-sm bg-cream object-contain p-2"
                />
                <button
                  type="button"
                  onClick={() => set({ qrUrl: "" })}
                  className="inline-flex min-h-11 items-center gap-2 font-semibold text-cream-muted underline hover:text-cream"
                >
                  <X aria-hidden size={16} strokeWidth={1.75} />
                  Remove the QR
                </button>
              </div>
            ) : (
              <p className="m-0 rounded-card-sm border border-dashed border-cream-faint p-5 text-cream-muted">
                No QR yet. Customers see only the bank details.
              </p>
            )}
            <div>
              <PhotoPicker onFile={(f) => void onQr(f)} uploading={uploading} describedBy="pay-qr-help">
                {d.qrUrl ? "Replace the QR" : "Upload a QR"}
              </PhotoPicker>
            </div>
            {uploadError ? (
              <p id="pay-qr-help" className="type-small m-0 flex items-center gap-2 text-cream">
                <ErrorMark />
                {uploadError}
              </p>
            ) : (
              <p id="pay-qr-help" className="type-small m-0 text-cream-muted">
                Your DuitNow or bank QR as a JPG, PNG or WebP, up to 5 MB. A screenshot from your banking app works. Saves
                with the rest.
              </p>
            )}
          </Block>
        </div>

        <div className={cn("grid min-w-0 content-start gap-4", section !== "contact" && "hidden")}>
          <Block title="WhatsApp">
            <Field
              id="pay-whatsapp"
              size="sm"
              label="Business WhatsApp number"
              optional
              type="tel"
              inputMode="tel"
              autoComplete="off"
              maxLength={30}
              placeholder={brand.whatsappDisplay}
              help={`Every "message us" link on the site opens a chat with this number. Leave it empty to use ${brand.whatsappDisplay}.`}
              value={d.whatsapp}
              error={phoneError}
              onChange={(e) => set({ whatsapp: e.target.value })}
              className="max-w-[320px]"
            />
          </Block>
        </div>

        <SettingsRail
          title="On the order page"
          rows={[
            railRow("Bank", base.bankName, "Not set"),
            railRow("Account name", base.accountName, "Not set"),
            railRow("Account number", base.accountNumber, "Not set"),
            railRow("QR", base.qrUrl.trim() ? "Uploaded" : "", "None"),
            railRow("WhatsApp", base.whatsapp, brand.whatsappDisplay),
          ]}
          note="What customers see now. It updates after you save."
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="ember"
          loading={saving}
          loadingLabel="Saving"
          disabled={!dirty && !saving}
          onClick={() => {
            if (!saving) void save();
          }}
        >
          Save changes
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!dirty || saving}
          onClick={() => {
            setD(base);
            setNotice(null);
            setPhoneError("");
            setUploadError("");
          }}
        >
          Discard changes
        </Button>
        <span className="type-small text-cream-muted">
          {dirty ? "You have changes that are not saved. They cover Payment and Contact." : "Nothing changes on the site until you save."}
        </span>
      </div>
    </>
  );
}
