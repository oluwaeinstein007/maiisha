"use client";

import { useState, type FormEvent } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/Button";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

interface StripePaymentFormProps {
  clientSecret: string;
  orderId: number;
  onSuccess: () => void;
}

export function StripePaymentForm({ clientSecret, orderId, onSuccess }: StripePaymentFormProps) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm orderId={orderId} onSuccess={onSuccess} />
    </Elements>
  );
}

function PaymentForm({ orderId, onSuccess }: { orderId: number; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?order=${orderId}`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
      onSuccess();
    } else {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/*
        FR-10: Apple Pay / Google Pay ride on the same PaymentElement as card —
        Stripe shows their buttons automatically ("auto") above the card fields
        when the browser/device is eligible. Made explicit here rather than
        relying on the Stripe account's default so it's visible in one place.
        Two things outside this codebase gate whether they actually render:
          - The page must be served over HTTPS (Apple Pay requires it; most
            browsers require a secure context for the Payment Request API).
          - Apple Pay additionally requires the serving domain to be verified
            in the Stripe Dashboard (Settings > Payment methods > Apple Pay >
            Add a new domain), which re-hosts a domain-association file at
            /.well-known/apple-developer-merchantid-domain-association.
      */}
      <PaymentElement options={{ wallets: { applePay: "auto", googlePay: "auto" } }} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!stripe}>
        Pay now
      </Button>
    </form>
  );
}
