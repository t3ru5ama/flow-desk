import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as authApi from "../../api/auth";
import { AppShell } from "../../components/layout/AppShell";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const org = useAuthStore((s) => s.org);
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const addToast = useUiStore((s) => s.addToast);
  const [name, setName] = useState(user?.name ?? "");
  const [password, setPassword] = useState("");

  const updateMutation = useMutation({
    mutationFn: () => authApi.updateMe({ name: name || undefined }),
    onSuccess: (updated) => {
      if (accessToken && org) setSession(accessToken, updated, org);
      addToast("Profile updated");
    },
    onError: () => addToast("Couldn't update profile", "error"),
  });

  const passwordMutation = useMutation({
    mutationFn: () => authApi.updateMe({ password }),
    onSuccess: () => {
      setPassword("");
      addToast("Password changed");
    },
    onError: () => addToast("Couldn't change password", "error"),
  });

  if (!user) return null;

  return (
    <AppShell title="Profile">
      <div className="flex max-w-md flex-col gap-6">
        <div className="flex items-center gap-4 rounded-lg border border-fd-khaki bg-white p-5">
          <Avatar name={user.name} size={48} />
          <div>
            <p className="font-medium text-fd-cacao">{user.name}</p>
            <p className="text-sm text-fd-taupe">{user.email}</p>
          </div>
        </div>

        <form
          className="flex flex-col gap-4 rounded-lg border border-fd-khaki bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
        >
          <h3 className="text-sm font-semibold text-fd-cacao">Account details</h3>
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
          <Button type="submit" disabled={updateMutation.isPending} className="self-start">
            Save changes
          </Button>
        </form>

        <form
          className="flex flex-col gap-4 rounded-lg border border-fd-khaki bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (password) passwordMutation.mutate();
          }}
        >
          <h3 className="text-sm font-semibold text-fd-cacao">Change password</h3>
          <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
          <Button type="submit" disabled={!password || passwordMutation.isPending} className="self-start">
            Change password
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
