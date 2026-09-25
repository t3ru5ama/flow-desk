import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import * as authApi from "../../api/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email),
    onSuccess: () => setSent(true),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-fd-pearl px-4">
      <div className="w-full max-w-sm rounded-lg border border-fd-khaki bg-white p-8">
        <h1 className="text-xl font-semibold text-fd-cacao">Reset your password</h1>
        {sent ? (
          <p className="mt-4 text-sm text-fd-taupe">
            If an account exists for that email, a reset link has been sent. In local dev, check{" "}
            <code className="text-fd-cacao">GET /api/dev/last-email</code>.
          </p>
        ) : (
          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              Send reset link
            </Button>
          </form>
        )}
        <div className="mt-4 text-center text-sm">
          <Link to="/login" className="text-fd-leather hover:underline">
            Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
}
