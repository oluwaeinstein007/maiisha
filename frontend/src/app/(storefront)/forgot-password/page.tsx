"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, ApiError, fieldError } from "@/lib/api";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
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
      <h1 className="font-display text-3xl text-ink">Reset your password</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {sent ? (
        <p className="mt-8 rounded-md bg-gold-soft/30 p-4 text-sm text-ink">
          If an account exists for {email}, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldError(errors, "email")}
          />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <Button type="submit" loading={submitting} className="w-full" size="lg">
            Send reset link
          </Button>
        </form>
      )}

      <p className="mt-6 text-sm text-ink-soft">
        <Link href="/login" className="font-medium text-ink hover:text-gold">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
