import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import * as authApi from "../../api/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuthStore } from "../../store/authStore";
import type { ApiError } from "../../types";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setSession(data.access_token, data.user, data.organization);
      navigate("/dashboard");
    },
    onError: (err: unknown) => {
      const apiError = (err as { response?: { data?: ApiError } }).response?.data;
      setServerError(apiError?.detail ?? "Login failed. Please try again.");
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-fd-pearl px-4">
      <div className="w-full max-w-sm rounded-lg border border-fd-khaki bg-white p-8">
        <h1 className="text-xl font-semibold text-fd-cacao">Log in to FlowDesk</h1>
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={handleSubmit((values) => {
            setServerError(null);
            loginMutation.mutate(values);
          })}
        >
          {serverError && (
            <div className="rounded-md bg-fd-error/10 px-3 py-2 text-sm text-fd-error">{serverError}</div>
          )}
          <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/forgot-password" className="text-fd-leather hover:underline">
            Forgot password?
          </Link>
          <Link to="/signup" className="text-fd-leather hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
