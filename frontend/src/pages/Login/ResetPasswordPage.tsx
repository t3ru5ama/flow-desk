import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import * as authApi from "../../api/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { ApiError } from "../../types";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.resetPassword(token, password),
    onSuccess: () => navigate("/login"),
    onError: (err: unknown) => {
      const apiError = (err as { response?: { data?: ApiError } }).response?.data;
      setError(apiError?.detail ?? "Reset failed. The link may have expired.");
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-fd-pearl px-4">
      <div className="w-full max-w-sm rounded-lg border border-fd-khaki bg-white p-8">
        <h1 className="text-xl font-semibold text-fd-cacao">Set a new password</h1>
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
        >
          {error && <div className="rounded-md bg-fd-error/10 px-3 py-2 text-sm text-fd-error">{error}</div>}
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <Button type="submit" disabled={mutation.isPending || !token} className="w-full">
            Reset password
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          <Link to="/login" className="text-fd-leather hover:underline">
            Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
}
