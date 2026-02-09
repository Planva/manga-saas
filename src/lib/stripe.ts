// src/lib/stripe.ts
import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

type KeySource = "cloudflare_env" | "process_env";

const classifyStripeKey = (value: string | undefined) => {
  if (!value) return "missing";
  if (value.startsWith("pk_")) return "pk_*";
  if (value.startsWith("sk_")) return "sk_*";
  if (value.startsWith("rk_")) return "rk_*";
  return "other";
};

const readCloudflareStripeSecret = () => {
  try {
    const { env } = getCloudflareContext();
    const raw = (env as { STRIPE_SECRET_KEY?: string } | undefined)?.STRIPE_SECRET_KEY;
    const value = typeof raw === "string" ? raw.trim() : "";
    return value || undefined;
  } catch {
    return undefined;
  }
};

const resolveStripeSecretKey = (): { value?: string; source: KeySource } => {
  const cloudflareValue = readCloudflareStripeSecret();
  if (cloudflareValue) {
    const processValue = process.env.STRIPE_SECRET_KEY?.trim();
    if (processValue && processValue !== cloudflareValue) {
      console.warn(
        "[stripe] STRIPE_SECRET_KEY mismatch between Cloudflare env and process.env.",
        `cloudflare=${classifyStripeKey(cloudflareValue)}`,
        `process=${classifyStripeKey(processValue)}`,
      );
    }
    return { value: cloudflareValue, source: "cloudflare_env" };
  }
  return { value: process.env.STRIPE_SECRET_KEY?.trim(), source: "process_env" };
};

export function getStripeKeyDebugInfo() {
  const cloudflareValue = readCloudflareStripeSecret();
  const processValue = process.env.STRIPE_SECRET_KEY?.trim();
  const resolved = resolveStripeSecretKey();
  return {
    selectedSource: resolved.source,
    selectedType: classifyStripeKey(resolved.value),
    cloudflareType: classifyStripeKey(cloudflareValue),
    processType: classifyStripeKey(processValue),
    hasMismatch: Boolean(cloudflareValue && processValue && cloudflareValue !== processValue),
  };
}

export function getStripe() {
  if (stripeInstance) return stripeInstance;

  const { value: stripeSecretKey, source } = resolveStripeSecretKey();
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }
  if (stripeSecretKey.startsWith("pk_")) {
    throw new Error(
      `Invalid STRIPE_SECRET_KEY from ${source}: a publishable key (pk_*) is configured. Set a secret key (sk_* or rk_*) in runtime secrets.`,
    );
  }
  if (!stripeSecretKey.startsWith("sk_") && !stripeSecretKey.startsWith("rk_")) {
    throw new Error(
      `Invalid STRIPE_SECRET_KEY format from ${source}. Expected a Stripe secret key (sk_* or rk_*).`,
    );
  }

  stripeInstance = new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
    httpClient: Stripe.createFetchHttpClient(), // Keep fetch client for Workers runtime.
    // Do not add cryptoProvider here; it breaks this runtime setup.
  });

  return stripeInstance;
}
