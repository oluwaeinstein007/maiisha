"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, fieldError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export function StockAlertForm({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    setError(undefined);
    try {
      await api.post(`/api/products/${slug}/stock-alert`, { email: email || user?.email });
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof ApiError ? (fieldError(err.errors, "email") ?? err.message) : "Something went wrong.");
    }
  };

  if (status === "done") {
    return <p role="status" className="mt-4 text-sm text-ink-soft">Thanks — we&apos;ll email you when it&apos;s back in stock.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-lg border border-ink/10 p-4">
      <p className="text-sm font-medium text-ink">Get notified when it&apos;s back</p>
      <div className="mt-3 flex items-start gap-2">
        <Input
          type="email"
          required
          aria-label="Email address"
          placeholder="you@example.com"
          value={email || user?.email || ""}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          className="flex-1"
        />
        <Button type="submit" loading={status === "sending"}>Notify me</Button>
      </div>
    </form>
  );
}
