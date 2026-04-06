"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SettingsCard } from "@/components/admin/settings-card";
import { useAdminChrome } from "@/components/admin/admin-chrome-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAdminUser,
  getAdminUsers,
  getSettings,
  updateAdminPassword,
  updateBranding,
  updateMaxOrders,
  type AdminUser,
} from "@/services/admin.service";
import { uploadImage } from "@/services/upload.service";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PhoneDisplayReadonly } from "@/components/admin/phone-display-readonly";
import { sanitizeIntegerInput } from "@/lib/sanitize-input";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { Eye, Loader2, Pencil, ShieldPlus } from "lucide-react";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { refreshBranding } = useAdminChrome();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [adminWhatsappNumber, setAdminWhatsappNumber] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [passwordEditAdminId, setPasswordEditAdminId] = useState<string | null>(
    null
  );
  const [passwordEditNew, setPasswordEditNew] = useState("");
  const [passwordEditConfirm, setPasswordEditConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [editingPaymentQr, setEditingPaymentQr] = useState(false);
  const [editingCompanyInfo, setEditingCompanyInfo] = useState(false);
  const [maxOrders, setMaxOrders] = useState("15");
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [minimumDeliveryAmount, setMinimumDeliveryAmount] = useState<
    number | null
  >(null);

  const load = useCallback(async () => {
    const t =
      typeof window !== "undefined"
        ? localStorage.getItem("admin_token")
        : null;
    if (!t) {
      router.replace("/admin/login");
      return;
    }
    setToken(t);
    try {
      const [s, admins] = await Promise.all([getSettings(t), getAdminUsers(t)]);
      setCompanyName(s.companyName?.trim() ?? "");
      setAdminWhatsappNumber(s.adminWhatsappNumber?.trim() ?? "");
      setCompanyLogoUrl(s.companyLogoUrl ?? null);
      setPaymentQrUrl(s.paymentQrUrl ?? null);
      setAdminUsers(admins);
      setMaxOrders(String(s.maxOrdersPerDay));
      setOrderingEnabled(s.orderingEnabled);
      setMinimumDeliveryAmount(s.minimumDeliveryAmount ?? null);
    } catch {
      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveBranding = async () => {
    if (!token) return;
    const phoneTrim = adminWhatsappNumber.trim();
    if (phoneTrim && !isValidPhoneNumber(phoneTrim)) {
      toast.error("Invalid admin phone", {
        description:
          "Enter a full number with country code (same picker as checkout).",
      });
      return;
    }
    setSaving(true);
    try {
      await updateBranding(
        {
          companyName: companyName.trim() || "",
          adminWhatsappNumber: phoneTrim || "",
        },
        token
      );
      await refreshBranding();
      toast.success("Company info saved");
      setEditingCompanyInfo(false);
      await load();
    } catch {
      toast.error("Failed to save company info");
    } finally {
      setSaving(false);
    }
  };

  const cancelCompanyInfoEdit = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const s = await getSettings(token);
      setCompanyName(s.companyName?.trim() ?? "");
      setAdminWhatsappNumber(s.adminWhatsappNumber?.trim() ?? "");
      setCompanyLogoUrl(s.companyLogoUrl ?? null);
      setEditingCompanyInfo(false);
      await refreshBranding();
    } catch {
      toast.error("Could not reload company info");
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentQrFile = async (file: File | null) => {
    if (!file || !token) return;
    setSaving(true);
    try {
      const { url } = await uploadImage(file, token);
      setPaymentQrUrl(url);
      await updateBranding({ paymentQrUrl: url }, token);
      toast.success("Payment QR saved");
      setEditingPaymentQr(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFile = async (file: File | null) => {
    if (!file || !token) return;
    setSaving(true);
    try {
      const { url } = await uploadImage(file, token);
      setCompanyLogoUrl(url);
      await updateBranding({ companyLogoUrl: url }, token);
      await refreshBranding();
      toast.success("Logo uploaded");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMaxOrders = async () => {
    if (!token) return;
    const n = parseInt(maxOrders, 10);
    if (Number.isNaN(n) || n < 1) {
      toast.error("Enter a valid number (at least 1)");
      return;
    }
    setSaving(true);
    try {
      await updateMaxOrders(n, token);
      toast.success("Max orders per day updated");
      await load();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const refreshAll = async () => {
    await load();
    await refreshBranding();
  };

  const handleCreateAdmin = async () => {
    if (!token) return;

    const email = newAdminEmail.trim().toLowerCase();
    const password = newAdminPassword;

    if (!email) {
      toast.error("Enter an admin email");
      return;
    }

    if (!password.trim() || password.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setCreatingAdmin(true);
    try {
      const created = await createAdminUser(
        { email, password: password.trim() },
        token
      );
      setAdminUsers((prev) => [...prev, created].sort((a, b) => a.email.localeCompare(b.email)));
      setNewAdminEmail("");
      setNewAdminPassword("");
      toast.success("Admin user added", {
        description: `${created.email} can now sign in to the admin panel.`,
      });
    } catch (e) {
      toast.error("Could not add admin user", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setCreatingAdmin(false);
    }
  };

  const cancelPasswordEdit = () => {
    setPasswordEditAdminId(null);
    setPasswordEditNew("");
    setPasswordEditConfirm("");
  };

  const handleSaveAdminPassword = async (adminId: string) => {
    if (!token) return;
    const p = passwordEditNew.trim();
    const c = passwordEditConfirm.trim();
    if (p.length < 6 || c.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (p !== c) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await updateAdminPassword(
        adminId,
        { password: p, confirmPassword: c },
        token
      );
      toast.success("Password updated", {
        description: "The admin can sign in with the new password.",
      });
      cancelPasswordEdit();
      await load();
    } catch (e) {
      toast.error("Could not update password", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading || !token) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-roast-red" />
      </div>
    );
  }

  const displayPreviewName = companyName.trim() || "Bakar & Roast";

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Settings"
        description="Storefront controls, capacity, and how your brand appears in the admin sidebar."
      />

      <Card className="overflow-hidden border-charcoal/10 shadow-card">
        <CardHeader className="border-b border-charcoal/10 bg-cream/30">
          <CardTitle className="font-display text-lg lg:text-xl">
            Company info
          </CardTitle>
          <p className="text-sm text-charcoal/65">
            Store name and logo appear in the admin sidebar. The admin phone is
            where new-order WhatsApp alerts are sent (Twilio). Leave the name
            empty to use the default &quot;Bakar & Roast&quot;. Logo uses the
            same upload pipeline as the menu.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {!editingCompanyInfo ? (
            <div className="space-y-5">
              <p className="flex items-center gap-2 text-sm font-medium text-charcoal/70">
                <Eye className="h-4 w-4 shrink-0 text-roast-red" aria-hidden />
                Viewing saved company info — tap Edit to change.
              </p>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex flex-col items-center gap-2 sm:items-start">
                  <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-charcoal/10">
                    <BrandLogo
                      size="lg"
                      className="size-16 sm:size-[4.5rem]"
                      src={companyLogoUrl}
                      alt={displayPreviewName}
                    />
                  </div>
                  <p className="text-center text-xs text-charcoal/50 sm:text-left">
                    {companyLogoUrl ? "Custom logo" : "Default logo mark"}
                  </p>
                </div>
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="space-y-1">
                    <p className="font-display text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                      Company / store name
                    </p>
                    <p className="rounded-xl border border-charcoal/10 bg-cream/30 px-4 py-3 text-base font-medium text-charcoal">
                      {companyName.trim() || (
                        <span className="text-charcoal/50">
                          (default: Bakar & Roast)
                        </span>
                      )}
                    </p>
                  </div>
                  <PhoneDisplayReadonly
                    label="Admin phone (WhatsApp alerts)"
                    value={adminWhatsappNumber}
                    emptyContent={
                      <span className="text-charcoal/50">
                        — (not set; uses{" "}
                        <code className="rounded bg-charcoal/5 px-1 text-xs">
                          ADMIN_WHATSAPP_NUMBER
                        </code>{" "}
                        in env if set)
                      </span>
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="font-display"
                    disabled={saving}
                    onClick={() => setEditingCompanyInfo(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit company info
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-roast-red">
                Editing company info — save to apply or cancel to discard changes
                to name and phone. Logo changes save when you upload or remove.
              </p>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex flex-col items-center gap-2 sm:items-start">
                  <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-charcoal/10">
                    <BrandLogo
                      size="lg"
                      className="size-16 sm:size-[4.5rem]"
                      src={companyLogoUrl}
                      alt={displayPreviewName}
                    />
                  </div>
                  <Label htmlFor="logo-file" className="font-display text-sm">
                    Logo
                  </Label>
                  <Input
                    id="logo-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="max-w-[220px] cursor-pointer text-sm"
                    disabled={saving}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      void handleLogoFile(f ?? null);
                      e.target.value = "";
                    }}
                  />
                  {companyLogoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="font-display text-charcoal/70"
                      disabled={saving}
                      onClick={async () => {
                        setCompanyLogoUrl(null);
                        if (!token) return;
                        setSaving(true);
                        try {
                          await updateBranding({ companyLogoUrl: "" }, token);
                          await refreshBranding();
                          toast.success("Logo removed — default mark will show");
                          await load();
                        } catch {
                          toast.error("Failed to remove logo");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Remove custom logo
                    </Button>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name" className="font-display">
                      Company / store name
                    </Label>
                    <Input
                      id="company-name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Bakar & Roast"
                      className="max-w-md"
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-whatsapp" className="font-display">
                      Admin phone (WhatsApp alerts)
                    </Label>
                    <PhoneInput
                      id="admin-whatsapp"
                      international
                      defaultCountry="MY"
                      limitMaxLength
                      placeholder="Enter phone number"
                      value={adminWhatsappNumber || undefined}
                      onChange={(value) =>
                        setAdminWhatsappNumber(value ?? "")
                      }
                      className="order-form-phone max-w-md"
                      aria-invalid={Boolean(
                        adminWhatsappNumber &&
                          !isValidPhoneNumber(adminWhatsappNumber)
                      )}
                      aria-describedby="admin-whatsapp-hint"
                      numberInputProps={{
                        autoComplete: "tel",
                      }}
                    />
                    <p
                      id="admin-whatsapp-hint"
                      className="text-xs text-charcoal/55"
                    >
                      New orders notify this number via Twilio WhatsApp. Use
                      international format (E.164). Clear the field to fall
                      back to{" "}
                      <code className="rounded bg-charcoal/5 px-1">
                        ADMIN_WHATSAPP_NUMBER
                      </code>{" "}
                      in server env if set.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="font-display"
                      disabled={saving}
                      onClick={() => void handleSaveBranding()}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save company info"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="font-display text-charcoal/80"
                      disabled={saving}
                      onClick={() => void cancelCompanyInfoEdit()}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-charcoal/10 shadow-card">
        <CardHeader className="border-b border-charcoal/10 bg-cream/30">
          <CardTitle className="font-display text-lg lg:text-xl">
            Payment QR (transfer)
          </CardTitle>
          <p className="text-sm text-charcoal/65">
            Shown when customers choose &quot;Pay now&quot; at checkout. Tap
            Edit to upload or replace the QR (PNG, JPEG, WebP, or SVG).
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <div className="flex min-h-[160px] w-full max-w-[220px] items-center justify-center rounded-2xl border border-charcoal/10 bg-white p-4 shadow-inner">
                {paymentQrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic admin URL (uploads or public)
                  <img
                    src={paymentQrUrl}
                    alt="Payment QR preview"
                    className="max-h-44 w-full object-contain"
                  />
                ) : (
                  <p className="text-center text-sm text-charcoal/45">
                    No QR uploaded yet
                  </p>
                )}
              </div>
              {!editingPaymentQr ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full max-w-[220px] font-display"
                  onClick={() => setEditingPaymentQr(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex w-full max-w-[220px] flex-col gap-2">
                  <Label htmlFor="payment-qr-file" className="font-display text-sm">
                    Choose image
                  </Label>
                  <Input
                    key="payment-qr-file-edit"
                    id="payment-qr-file"
                    type="file"
                    accept="image/svg+xml,image/png,image/jpeg,image/webp,.svg,.png,.jpg,.jpeg,.webp"
                    className="cursor-pointer text-sm"
                    disabled={saving}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      void handlePaymentQrFile(f ?? null);
                      e.target.value = "";
                    }}
                  />
                  {paymentQrUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="font-display text-charcoal/70"
                      disabled={saving}
                      onClick={async () => {
                        setPaymentQrUrl(null);
                        if (!token) return;
                        setSaving(true);
                        try {
                          await updateBranding({ paymentQrUrl: "" }, token);
                          toast.success(
                            "Payment QR removed — checkout will use the default or env URL"
                          );
                          setEditingPaymentQr(false);
                          await load();
                        } catch {
                          toast.error("Failed to remove");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Remove custom QR
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="font-display text-charcoal/70"
                    disabled={saving}
                    onClick={() => setEditingPaymentQr(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            <p className="max-w-md text-sm text-charcoal/60">
              {editingPaymentQr
                ? "Max file size 5MB. The image is saved when you choose a file. Use Cancel to leave without changing upload controls."
                : "Use Edit to upload a new file or remove the current QR."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-charcoal/10 shadow-card">
        <CardHeader className="border-b border-charcoal/10 bg-cream/30">
          <CardTitle className="font-display text-lg lg:text-xl">
            Admin access
          </CardTitle>
          <p className="text-sm text-charcoal/65">
            Add another admin by email and set the password manually here. The
            new user can sign in immediately after saving.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-admin-email" className="font-display">
                  Admin email
                </Label>
                <Input
                  id="new-admin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. ops@bunsandtheory.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-admin-password" className="font-display">
                  Password
                </Label>
                <Input
                  id="new-admin-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="max-w-md"
                />
                <p className="text-xs text-charcoal/55">
                  Set the password now and share it securely with the new admin.
                </p>
              </div>
              <Button
                type="button"
                className="font-display"
                disabled={creatingAdmin}
                onClick={() => void handleCreateAdmin()}
              >
                {creatingAdmin ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ShieldPlus className="mr-2 h-4 w-4" />
                    Add admin user
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3 rounded-2xl border border-charcoal/10 bg-white/80 p-4 shadow-sm">
              <div>
                <p className="font-display text-base text-charcoal">
                  Current admins
                </p>
                <p className="text-sm text-charcoal/55">
                  {adminUsers.length} account{adminUsers.length === 1 ? "" : "s"} with admin access.
                </p>
              </div>
              <div className="space-y-2">
                {adminUsers.map((admin) => (
                  <div
                    key={admin.id}
                    className="rounded-xl border border-charcoal/8 bg-cream/30 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="break-all font-medium text-charcoal">
                        {admin.email}
                      </p>
                      {passwordEditAdminId !== admin.id ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 gap-1 text-roast-red hover:bg-roast-red/10 hover:text-roast-red"
                          onClick={() => {
                            setPasswordEditAdminId(admin.id);
                            setPasswordEditNew("");
                            setPasswordEditConfirm("");
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Edit
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-xs text-charcoal/50">
                      Added{" "}
                      {new Date(admin.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {passwordEditAdminId === admin.id ? (
                      <div className="mt-3 space-y-3 border-t border-charcoal/10 pt-3">
                        <div className="space-y-2">
                          <Label
                            htmlFor={`admin-pw-${admin.id}`}
                            className="font-display text-xs"
                          >
                            New password
                          </Label>
                          <Input
                            id={`admin-pw-${admin.id}`}
                            type="password"
                            autoComplete="new-password"
                            value={passwordEditNew}
                            onChange={(e) => setPasswordEditNew(e.target.value)}
                            placeholder="At least 6 characters"
                            className="max-w-md"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`admin-pw-confirm-${admin.id}`}
                            className="font-display text-xs"
                          >
                            Confirm password
                          </Label>
                          <Input
                            id={`admin-pw-confirm-${admin.id}`}
                            type="password"
                            autoComplete="new-password"
                            value={passwordEditConfirm}
                            onChange={(e) =>
                              setPasswordEditConfirm(e.target.value)
                            }
                            placeholder="Re-enter password"
                            className="max-w-md"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="font-display"
                            disabled={savingPassword}
                            onClick={() => void handleSaveAdminPassword(admin.id)}
                          >
                            {savingPassword ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Save password"
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="font-display"
                            disabled={savingPassword}
                            onClick={cancelPasswordEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-charcoal/10 shadow-card">
        <CardHeader className="border-b border-charcoal/10 bg-cream/30">
          <CardTitle className="font-display text-lg lg:text-xl">
            Kitchen capacity (global)
          </CardTitle>
          <p className="text-sm text-charcoal/65">
            Upper bound used with batch limits; adjust if your operation
            changes.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="max-orders" className="font-display">
                Max orders per day
              </Label>
              <Input
                id="max-orders"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-32"
                value={maxOrders}
                onChange={(e) =>
                  setMaxOrders(sanitizeIntegerInput(e.target.value))
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="font-display"
              disabled={saving}
              onClick={() => void handleSaveMaxOrders()}
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <SettingsCard
        token={token}
        orderingEnabled={orderingEnabled}
        minimumDeliveryAmount={minimumDeliveryAmount}
        onUpdate={refreshAll}
      />
    </div>
  );
}
