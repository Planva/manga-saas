"use client";

import * as React from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MarketingPricingPlan } from "@/config/marketing-pricing-plans";
import {
  createPopupPaymentSession,
  finalizePopupPackPayment,
} from "@/app/(marketing)/price/server-actions";

type Props = {
  packs: MarketingPricingPlan[];
  subscriptions: MarketingPricingPlan[];
  stripePublishableKey: string | null;
};

const EXPRESS_CHECKOUT_METHOD_ORDER = [
  "paypal",
  "amazon_pay",
  "google_pay",
  "apple_pay",
  "link",
] as const;

const PAYMENT_ELEMENT_METHOD_ORDER = [
  "paypal",
  "amazon_pay",
  "google_pay",
  "apple_pay",
  "link",
  "card",
  "kr_card",
  "kakao_pay",
  "naver_pay",
  "payco",
  "samsung_pay",
  "mb_way",
  "revolut_pay",
  "wechat_pay",
  "alipay",
  "multibanco",
  "bancontact",
  "eps",
  "pay_by_bank",
  "twint",
  "afterpay_clearpay",
  "billie",
  "klarna",
] as const;

const A11yDialogTitle = DialogTitle as unknown as React.ComponentType<{
  children: React.ReactNode;
  className?: string;
}>;
const A11yDialogDescription = DialogDescription as unknown as React.ComponentType<{
  children: React.ReactNode;
  className?: string;
}>;

function PlanSection({
  title,
  plans,
  disabled,
  onSelect,
}: {
  title: string;
  plans: MarketingPricingPlan[];
  disabled: boolean;
  onSelect: (plan: MarketingPricingPlan) => void;
}) {
  if (!plans.length) return null;

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid gap-3">
        {plans.map((plan) => (
          <button
            key={plan.priceId}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(plan)}
            className={[
              "rounded-xl border border-border bg-card p-4 text-left transition",
              "hover:border-fuchsia-500/60 hover:shadow-sm",
              "disabled:cursor-not-allowed disabled:opacity-70",
              plan.highlight ? "ring-1 ring-fuchsia-500/25" : "",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-base font-semibold">{plan.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{plan.subtitle}</div>
              </div>
              <div className="shrink-0 text-lg font-bold">{plan.price}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function PopupPaymentForm({
  clientSecret,
  plan,
  onSuccess,
  onBack,
}: {
  clientSecret: string;
  plan: MarketingPricingPlan;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const confirmAndFinalize = async (): Promise<boolean> => {
    if (!stripe || !elements || isSubmitting) return false;

    setIsSubmitting(true);
    try {
      const submitResult = await elements.submit();
      if (submitResult.error) {
        toast.error(submitResult.error.message || "Payment form is incomplete.");
        return false;
      }

      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/billing?status=success&kind=${plan.kind}`,
        },
      });

      if (error) {
        toast.error(error.message || "Payment failed");
        return false;
      }

      const paymentResult = await stripe.retrievePaymentIntent(clientSecret);
      const paymentIntent = paymentResult.paymentIntent;
      if (!paymentIntent) {
        throw new Error("Missing payment intent after confirmation.");
      }

      if (plan.kind === "pack") {
        await finalizePopupPackPayment({
          paymentIntentId: paymentIntent.id,
          priceId: plan.priceId,
        });
      }

      toast.success(plan.kind === "subscription" ? "Subscription activated." : "Payment successful.");
      onSuccess();
      return true;
    } catch (error) {
      console.error("[payment-modal] confirmation failed", error);
      toast.error("Payment failed. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await confirmAndFinalize();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-3">
        <ExpressCheckoutElement
          options={{
            paymentMethodOrder: [...EXPRESS_CHECKOUT_METHOD_ORDER],
            paymentMethods: {
              paypal: "auto",
              amazonPay: "auto",
              googlePay: "always",
              applePay: "always",
              link: "auto",
            },
          }}
          onConfirm={async (event) => {
            const success = await confirmAndFinalize();
            if (!success) {
              event.paymentFailed({ reason: "fail" });
            }
          }}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: [...PAYMENT_ELEMENT_METHOD_ORDER],
            wallets: {
              applePay: "auto",
              googlePay: "auto",
            },
          }}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button type="submit" disabled={isSubmitting || !stripe || !elements}>
          {isSubmitting ? "Processing..." : "Confirm and pay"}
        </Button>
      </div>
    </form>
  );
}

export default function TestPopupPaymentButtonClient({
  packs,
  subscriptions,
  stripePublishableKey,
}: Props) {
  const router = useRouter();
  const stripePromise = React.useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  );
  const [open, setOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<MarketingPricingPlan | null>(null);
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  const resetDialogState = React.useCallback(() => {
    setSelectedPlan(null);
    setClientSecret(null);
    setIsCreating(false);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetDialogState();
    }
  };

  const startPopupPayment = async (plan: MarketingPricingPlan) => {
    setIsCreating(true);
    setSelectedPlan(plan);
    setClientSecret(null);

    try {
      const result = await createPopupPaymentSession({
        kind: plan.kind,
        priceId: plan.priceId,
      });

      if ("redirectUrl" in result) {
        window.location.href = result.redirectUrl;
        return;
      }
      if ("errorMessage" in result) {
        console.error("[payment-modal] initialize failed", {
          kind: plan.kind,
          priceId: plan.priceId,
          message: result.errorMessage,
        });
        toast.error(result.errorMessage);
        setSelectedPlan(null);
        return;
      }

      setClientSecret(result.clientSecret);
    } catch (error) {
      console.error("[payment-modal] failed to initialize payment form", error);
      toast.error("Failed to initialize payment. Please try again.");
      setSelectedPlan(null);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="rounded-xl border-fuchsia-500/50 text-fuchsia-700 hover:text-fuchsia-700 dark:text-fuchsia-300 dark:hover:text-fuchsia-200"
        onClick={() => setOpen(true)}
      >
        Test: Popup Payment
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-4xl p-0">
          <div className="p-5 sm:p-6">
            <DialogHeader>
              <A11yDialogTitle className="sr-only">
                {selectedPlan && clientSecret ? "Confirm and pay" : "Select a package"}
              </A11yDialogTitle>
              <A11yDialogDescription className="sr-only">
                {selectedPlan
                  ? `${selectedPlan.title} · ${selectedPlan.subtitle}`
                  : "Select one-time or subscription packages, then complete payment in this popup."}
              </A11yDialogDescription>
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                {selectedPlan && clientSecret ? "Confirm and pay" : "Select a package"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedPlan
                  ? `${selectedPlan.title} · ${selectedPlan.subtitle}`
                  : "Includes one-time packs and subscriptions, grouped like the pricing page."}
              </p>
            </DialogHeader>

            {!selectedPlan && (
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <PlanSection
                  title="One-time packs"
                  plans={packs}
                  disabled={isCreating}
                  onSelect={startPopupPayment}
                />
                <PlanSection
                  title="Subscriptions"
                  plans={subscriptions}
                  disabled={isCreating}
                  onSelect={startPopupPayment}
                />
              </div>
            )}

            {selectedPlan && (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold">{selectedPlan.title}</div>
                      <div className="text-sm text-muted-foreground">{selectedPlan.subtitle}</div>
                    </div>
                    <div className="text-3xl font-bold">{selectedPlan.price}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="mb-2 text-xs text-muted-foreground">
                    Preferred methods are pinned first when available: PayPal, Amazon Pay, Google Pay, Apple Pay, Link. Additional methods (Kakao Pay, Naver Pay, PAYCO, MB WAY, Revolut Pay, WeChat Pay, Alipay, Multibanco, Bancontact, EPS, Pay by Bank, TWINT, Afterpay/Clearpay, Billie, Klarna) are shown by Stripe when region/currency/amount eligibility is met.
                  </div>

                  {!stripePromise && (
                    <div className="rounded-lg border border-dashed border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                      Missing Stripe publishable key. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                      (or STRIPE_PUBLISHABLE_KEY) in runtime environment.
                    </div>
                  )}

                  {stripePromise && !clientSecret && (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      {isCreating ? "Initializing payment form..." : "Preparing payment form..."}
                    </div>
                  )}

                  {stripePromise && clientSecret && (
                    <Elements
                      key={clientSecret}
                      stripe={stripePromise}
                      options={{
                        clientSecret,
                        appearance: { theme: "stripe" },
                      }}
                    >
                      <PopupPaymentForm
                        clientSecret={clientSecret}
                        plan={selectedPlan}
                        onBack={() => {
                          if (isCreating) return;
                          setClientSecret(null);
                          setSelectedPlan(null);
                        }}
                        onSuccess={() => {
                          setOpen(false);
                          resetDialogState();
                          router.refresh();
                        }}
                      />
                    </Elements>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
