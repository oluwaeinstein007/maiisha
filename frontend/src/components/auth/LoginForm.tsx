"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, fieldError } from "@/lib/api";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function LoginForm({ defaultRedirect = "/account" }: { defaultRedirect?: string }) {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});
    try {
      await login(email, password);
      router.push(searchParams.get("redirect") ?? defaultRedirect);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors ?? {});
        setFormError(err.errors ? null : err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl text-ink">Sign in</h1>
      <p className="mt-2 text-sm text-ink-soft">Welcome back to MAI_ISHA.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldError(errors, "email")}
        />
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldError(errors, "password")}
        />

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex items-center justify-between text-xs">
          <Link href="/forgot-password" className="text-ink-soft hover:text-gold">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={submitting} className="w-full" size="lg">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        New to MAI_ISHA?{" "}
        <Link href="/register" className="font-medium text-ink hover:text-gold">
          Create an account
        </Link>
      </p>
    </div>
  );
}
