"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, fieldError } from "@/lib/api";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});
    try {
      await register({ ...form, phone: form.phone || undefined });
      router.push(searchParams.get("redirect") ?? "/account");
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
      <h1 className="font-display text-3xl text-ink">Create an account</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Register to check out, track orders and save addresses.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Input
          label="Full name"
          required
          value={form.name}
          onChange={update("name")}
          error={fieldError(errors, "name")}
        />
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={update("email")}
          error={fieldError(errors, "email")}
        />
        <Input
          label="Phone (optional)"
          type="tel"
          value={form.phone}
          onChange={update("phone")}
          error={fieldError(errors, "phone")}
          hint="Used for delivery notifications."
        />
        <Input
          label="Password"
          type="password"
          required
          value={form.password}
          onChange={update("password")}
          error={fieldError(errors, "password")}
        />
        <Input
          label="Confirm password"
          type="password"
          required
          value={form.password_confirmation}
          onChange={update("password_confirmation")}
        />

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <Button type="submit" loading={submitting} className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink hover:text-gold">
          Sign in
        </Link>
      </p>
    </div>
  );
}
