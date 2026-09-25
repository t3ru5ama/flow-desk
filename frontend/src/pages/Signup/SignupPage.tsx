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
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Za-z]/, "Must contain a letter")
    .regex(/\d/, "Must contain a digit"),
  organization_name: z.string().min(1, "Organization name is required").max(255),
});
type FormValues = z.infer<typeof schema>;

export function SignupPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const signupMutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (data) => {
      setSession(data.access_token, data.user, data.organization);
      navigate("/dashboard");
    },
    onError: (err: unknown) => {
      const apiError = (err as { response?: { data?: ApiError } }).response?.data;
      if (apiError?.fields) {
        for (const [field, message] of Object.entries(apiError.fields)) {
          setError(field as keyof FormValues, { message });
        }
      }
      setServerError(apiError?.detail ?? "Signup failed. Please try again.");
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-fd-pearl px-4 py-8">
      <div className="w-full max-w-sm rounded-lg border border-fd-khaki bg-white p-8">
        <h1 className="text-xl font-semibold text-fd-cacao">Create your FlowDesk account</h1>
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={handleSubmit((values) => {
            setServerError(null);
            signupMutation.mutate(values);
          })}
        >
          {serverError && (
            <div className="rounded-md bg-fd-error/10 px-3 py-2 text-sm text-fd-error">{serverError}</div>
          )}
          <Input label="Full name" error={errors.name?.message} {...register("name")} />
          <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input label="Organization name" error={errors.organization_name?.message} {...register("organization_name")} />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating account…" : "Sign up"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          <span className="text-fd-taupe">Already have an account? </span>
          <Link to="/login" className="text-fd-leather hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
