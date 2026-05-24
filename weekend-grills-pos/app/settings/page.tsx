'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Flame, Loader2, Pencil, Settings } from 'lucide-react';
import Image from 'next/image';
import { PosShell } from '@/components/layout/pos-shell';
import { useAuthStore } from '@/store/auth.store';
import { posSettingsService, PosSettings } from '@/services/settings.service';
import { uploadImage } from '@/services/upload.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AdminTeamCard } from '@/components/settings/admin-team-card';
import { adminDisplayLabel } from '@/lib/admin-display';

export default function SettingsPage() {
  const { admin } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PosSettings | null>(null);

  const [editingCompany, setEditingCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [editingQr, setEditingQr] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  function notifyBrandingUpdated() {
    window.dispatchEvent(new CustomEvent('pos-branding-updated'));
  }

  const load = useCallback(async () => {
    try {
      const s = await posSettingsService.getSettings();
      setSettings(s);
      setCompanyName(s.companyName ?? '');
      setCompanyLogoUrl(s.companyLogoUrl ?? null);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveCompanyName() {
    setSaving(true);
    try {
      await posSettingsService.updateBranding({
        companyName: companyName.trim(),
      });
      toast.success('Company name saved');
      setEditingCompany(false);
      notifyBrandingUpdated();
      await load();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { url } = await uploadImage(file);
      setCompanyLogoUrl(url);
      await posSettingsService.updateBranding({ companyLogoUrl: url });
      toast.success('Logo uploaded');
      notifyBrandingUpdated();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    setSaving(true);
    try {
      setCompanyLogoUrl(null);
      await posSettingsService.updateBranding({ companyLogoUrl: '' });
      toast.success('Logo removed — default mark will show');
      notifyBrandingUpdated();
      await load();
    } catch {
      toast.error('Failed to remove logo');
    } finally {
      setSaving(false);
    }
  }

  async function handlePaymentQrUpload(file: File | null) {
    if (!file) return;
    setUploadingQr(true);
    try {
      const { url } = await uploadImage(file);
      await posSettingsService.updateBranding({ paymentQrUrl: url });
      toast.success('Payment QR saved');
      setEditingQr(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingQr(false);
    }
  }

  async function handleRemoveQr() {
    setSaving(true);
    try {
      await posSettingsService.updateBranding({ paymentQrUrl: '' });
      toast.success('Payment QR removed');
      setEditingQr(false);
      await load();
    } catch {
      toast.error('Failed to remove QR');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PosShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-bbq-flame" />
        </div>
      </PosShell>
    );
  }

  return (
    <PosShell>
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-card px-5 py-3 flex items-center gap-3">
          <Settings className="h-5 w-5 text-bbq-flame" />
          <h1 className="font-display text-lg font-bold text-foreground">
            Settings
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5 max-w-2xl">
          {/* Account */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="font-display text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground font-display font-bold uppercase tracking-wide mb-1">
                  Logged in as
                </p>
                <p className="font-display font-semibold text-foreground text-sm">
                  {admin ? adminDisplayLabel(admin) : '—'}
                </p>
                {admin?.email ? (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {admin.email}
                  </p>
                ) : null}
              </div>
              <Separator />
              <div>
                <p className="text-[10px] text-muted-foreground font-display font-bold uppercase tracking-wide mb-1">
                  System
                </p>
                <p className="text-sm text-foreground font-display">
                  The Weekend Grills POS · Tropical Vibe Barbeque
                </p>
              </div>
            </CardContent>
          </Card>

          <AdminTeamCard />

          {/* Company info */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="font-display text-base">
                Company info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Store name and logo appear in the POS sidebar. Leave the name empty
                to use the default &quot;The Weekend Grills&quot;.
              </p>
              {!editingCompany ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="flex flex-col items-center gap-2 sm:items-start">
                      <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-border">
                        <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg sm:h-[4.5rem] sm:w-[4.5rem]">
                          {companyLogoUrl ? (
                            <Image
                              src={companyLogoUrl}
                              alt={
                                companyName.trim() || 'The Weekend Grills'
                              }
                              fill
                              className="object-contain p-1"
                              sizes="72px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-lg bg-bbq-flame">
                              <Flame className="h-7 w-7 text-white opacity-90" />
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-center text-xs text-muted-foreground sm:text-left">
                        {companyLogoUrl ? 'Custom logo' : 'Default logo mark'}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground font-display font-bold uppercase tracking-wide mb-1">
                        Store name
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {settings?.companyName?.trim() || (
                          <span className="text-muted-foreground">
                            (default: The Weekend Grills)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-display"
                    onClick={() => setEditingCompany(true)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit company info
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="flex flex-col items-center gap-2 sm:items-start">
                      <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-border">
                        <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg sm:h-[4.5rem] sm:w-[4.5rem]">
                          {companyLogoUrl ? (
                            <Image
                              src={companyLogoUrl}
                              alt={
                                companyName.trim() || 'The Weekend Grills'
                              }
                              fill
                              className="object-contain p-1"
                              sizes="72px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-lg bg-bbq-flame">
                              <Flame className="h-7 w-7 text-white opacity-90" />
                            </div>
                          )}
                        </div>
                      </div>
                      <Label htmlFor="logo-upload" className="font-display text-sm">
                        Logo
                      </Label>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        className="max-w-[220px] cursor-pointer text-sm"
                        disabled={uploadingLogo || saving}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          void handleLogoUpload(f ?? null);
                          e.target.value = '';
                        }}
                      />
                      {uploadingLogo && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading…
                        </div>
                      )}
                      {companyLogoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="font-display text-xs text-destructive"
                          disabled={saving || uploadingLogo}
                          onClick={handleRemoveLogo}
                        >
                          Remove custom logo
                        </Button>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <Label htmlFor="company-name" className="font-display">
                        Store name
                      </Label>
                      <Input
                        id="company-name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="The Weekend Grills"
                        maxLength={120}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="font-display bg-bbq-flame text-white hover:bg-bbq-flame/90"
                      disabled={saving || uploadingLogo}
                      onClick={handleSaveCompanyName}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Save'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="font-display"
                      disabled={uploadingLogo}
                      onClick={() => {
                        setEditingCompany(false);
                        setCompanyName(settings?.companyName ?? '');
                        setCompanyLogoUrl(settings?.companyLogoUrl ?? null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment QR */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="font-display text-base">
                Payment QR (transfer)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-stretch">
                <div className="flex shrink-0 flex-col items-center gap-3 sm:items-start">
                  <div className="flex w-full max-w-[240px] flex-col gap-2">
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-white shadow-inner">
                      {settings?.paymentQrUrl ? (
                        // unoptimized: /uploads/ URLs skip optimizer so preview always resolves (localhost, etc.).
                        <Image
                          src={settings.paymentQrUrl}
                          alt="Payment QR scan to transfer preview"
                          fill
                          className="object-contain p-3"
                          sizes="240px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex aspect-square flex-col items-center justify-center gap-2 bg-muted/40 p-4 text-center">
                          <span className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            No QR yet
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Upload to preview here and at QR checkout
                          </span>
                        </div>
                      )}
                    </div>
                    {settings?.paymentQrUrl ? (
                      <a
                        href={settings.paymentQrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 text-center font-display text-xs font-bold text-bbq-teal hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        View full-size image
                      </a>
                    ) : null}
                  </div>
                  {!editingQr ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full max-w-[240px] font-display"
                      onClick={() => setEditingQr(true)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex w-full max-w-[240px] flex-col gap-2">
                      <Label
                        htmlFor="qr-upload"
                        className="font-display text-xs"
                      >
                        Choose image
                      </Label>
                      <Input
                        id="qr-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        className="cursor-pointer text-xs"
                        disabled={uploadingQr || saving}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          void handlePaymentQrUpload(f ?? null);
                          e.target.value = '';
                        }}
                      />
                      {uploadingQr && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading…
                        </div>
                      )}
                      {settings?.paymentQrUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="font-display text-xs text-destructive"
                          disabled={saving}
                          onClick={handleRemoveQr}
                        >
                          Remove QR
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="font-display text-xs"
                        onClick={() => setEditingQr(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
                <p className="max-w-md self-center font-display text-sm leading-relaxed text-muted-foreground sm:self-start">
                  This QR code is shown to guests when they choose{' '}
                  <span className="font-semibold text-foreground">QR Pay</span>{' '}
                  on the payment step. Upload a PNG, JPEG, or WebP image (max
                  5MB). Preview updates here as soon as the file saves.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PosShell>
  );
}
