import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as teamApi from "../../api/team";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuthStore } from "../../store/authStore";
import type { ApiError } from "../../types";

export function InviteAcceptPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const token = params.get("token") ?? "";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => teamApi.acceptInvite({ token, name: name || undefined, password: password || undefined }),
    onSuccess: (data) => {
      setSession(data.access_token, data.user, data.organization);
      navigate("/dashboard");
    },
    onError: (err: unknown) => {
      const apiError = (err as { response?: { data?: ApiError } }).response?.data;
      setError(apiError?.detail ?? "Couldn't accept this invite. The link may have expired.");
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-fd-pearl px-4">
      <div className="w-full max-w-sm rounded-lg border border-fd-khaki bg-white p-8">
        <h1 className="text-xl font-semibold text-fd-cacao">Join your team on FlowDesk</h1>
        <p className="mt-2 text-sm text-fd-taupe">
          If you don't already have a FlowDesk account, set a name and password below to create one.
        </p>
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
        >
          {error && <div className="rounded-md bg-fd-error/10 px-3 py-2 text-sm text-fd-error">{error}</div>}
          <Input label="Full name (new accounts only)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Password (new accounts only)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={mutation.isPending || !token} className="w-full">
            Accept invite
          </Button>
        </form>
      </div>
    </div>
  );
}
