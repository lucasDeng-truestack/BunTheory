'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pencil, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ListedAdmin,
  adminsService,
} from '@/services/admins.service';
import { useAuthStore } from '@/store/auth.store';
import { adminDisplayLabel } from '@/lib/admin-display';

export function AdminTeamCard() {
  const { admin: self, mergeAdmin } = useAuthStore();
  const [admins, setAdmins] = useState<ListedAdmin[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const refresh = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await adminsService.list();
      setAdmins(list);
    } catch {
      toast.error('Could not load admins');
      setAdmins([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    const pwd = newPassword.trim();
    const em = newEmail.trim().toLowerCase();
    if (!em || pwd.length < 6) {
      toast.error('Email and password (min 6 characters) are required');
      return;
    }
    setSavingNew(true);
    try {
      await adminsService.create({
        email: em,
        password: pwd,
        displayName: newName.trim() || undefined,
      });
      toast.success('Admin added');
      setAddOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add admin');
    } finally {
      setSavingNew(false);
    }
  }

  async function submitDisplayName(adminId: string) {
    setSavingName(true);
    try {
      const updated = await adminsService.updateDisplayName(adminId, editName);
      if (adminId === self?.id) {
        mergeAdmin({ displayName: updated.displayName });
      }
      toast.success('Name saved');
      setEditId(null);
      await refresh();
    } catch {
      toast.error('Could not save name');
    } finally {
      setSavingName(false);
    }
  }

  function startEdit(row: ListedAdmin) {
    setEditId(row.id);
    setEditName(row.displayName ?? '');
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <CardTitle className="font-display text-base">Staff accounts</CardTitle>
          <Button
            type="button"
            size="sm"
            className="font-display bg-bbq-flame text-white hover:bg-bbq-flame/90"
            onClick={() => setAddOpen(true)}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Add admin
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          <p className="text-xs text-muted-foreground">
            Names appear in the sidebar and order details instead of generic labels.
          </p>
          {loadingList ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-bbq-flame" />
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {admins.map((row) => {
                const primary = adminDisplayLabel({
                  email: row.email,
                  displayName: row.displayName,
                });
                const isSelf = row.id === self?.id;
                const isEditing = editId === row.id;
                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold truncate">
                        {primary}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.email}
                        {isSelf ? (
                          <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                            You
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {!isEditing ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="font-display shrink-0"
                        onClick={() => startEdit(row)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit name
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Display name"
                          maxLength={80}
                          className="font-display sm:w-48 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="font-display bg-bbq-flame text-white hover:bg-bbq-flame/90"
                            disabled={savingName}
                            onClick={() => void submitDisplayName(row.id)}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={savingName}
                            onClick={() => setEditId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateAdmin}>
            <DialogHeader>
              <DialogTitle className="font-display">Add admin</DialogTitle>
              <DialogDescription>
                New staff log in with this email and password at the POS sign-in screen.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="add-admin-name" className="font-display">
                  Display name
                </Label>
                <Input
                  id="add-admin-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Aisyah"
                  maxLength={80}
                  className="font-display"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-admin-email" className="font-display">
                  Email
                </Label>
                <Input
                  id="add-admin-email"
                  type="email"
                  autoComplete="off"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="staff@yourstore.com"
                  className="font-display"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-admin-password" className="font-display">
                  Password (min 6 characters)
                </Label>
                <Input
                  id="add-admin-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                  className="font-display"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="font-display"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingNew}
                className="font-display bg-bbq-flame text-white hover:bg-bbq-flame/90"
              >
                {savingNew ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create account'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
