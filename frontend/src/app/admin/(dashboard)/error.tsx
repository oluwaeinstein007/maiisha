"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <AlertTriangle size={28} className="text-gold" />
      <h1 className="mt-3 font-display text-xl text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        This page couldn&apos;t load. This is usually temporary — try again in a moment.
      </p>
      <Button className="mt-5" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
