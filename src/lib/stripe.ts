// src/lib/stripe.ts
import "server-only";
import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe() {
  if (stripeInstance) return stripeInstance;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }
  if (stripeSecretKey.startsWith("pk_")) {
    throw new Error(
      "Invalid STRIPE_SECRET_KEY: a publishable key (pk_*) is configured. Set a secret key (sk_* or rk_*) in the runtime environment.",
    );
  }
  if (!stripeSecretKey.startsWith("sk_") && !stripeSecretKey.startsWith("rk_")) {
    throw new Error(
      "Invalid STRIPE_SECRET_KEY format. Expected a Stripe secret key (sk_* or rk_*).",
    );
  }

  stripeInstance = new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
    httpClient: Stripe.createFetchHttpClient(), // ✅ 保留 fetch client
    // ❌ 不要加 cryptoProvider（这就是你现在的报错源头）
  });

  return stripeInstance;
}
