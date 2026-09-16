"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 text-center">
      <AlertTriangle size={32} className="text-gold" />
      <h1 className="mt-4 font-display text-2xl text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        We couldn&apos;t load this page. This is usually temporary — try again in a moment.
      </p>
      <Button className="mt-6" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
