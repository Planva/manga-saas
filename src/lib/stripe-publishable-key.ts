import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type KeySource =
  | "cloudflare_env_next_public"
  | "cloudflare_env_plain"
  | "process_env_next_public"
  | "process_env_plain";

const classifyKey = (value: string | undefined) => {
  if (!value) return "missing";
  if (value.startsWith("pk_")) return "pk_*";
  if (value.startsWith("sk_")) return "sk_*";
  if (value.startsWith("rk_")) return "rk_*";
  return "other";
};

const normalize = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const readCloudflarePublishableKey = (): { value?: string; source?: KeySource } => {
  try {
    const { env } = getCloudflareContext();
    const cf = env as
      | {
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
          STRIPE_PUBLISHABLE_KEY?: string;
        }
      | undefined;

    const nextPublic = normalize(cf?.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    if (nextPublic) {
      return { value: nextPublic, source: "cloudflare_env_next_public" };
    }

    const plain = normalize(cf?.STRIPE_PUBLISHABLE_KEY);
    if (plain) {
      return { value: plain, source: "cloudflare_env_plain" };
    }
  } catch {
    // Ignore context access errors in local/build contexts.
  }

  return {};
};

const readProcessPublishableKey = (): { value?: string; source?: KeySource } => {
  const nextPublic = normalize(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  if (nextPublic) {
    return { value: nextPublic, source: "process_env_next_public" };
  }

  const plain = normalize(process.env.STRIPE_PUBLISHABLE_KEY);
  if (plain) {
    return { value: plain, source: "process_env_plain" };
  }

  return {};
};

const resolvePublishableKey = (): { value?: string; source?: KeySource } => {
  const fromCloudflare = readCloudflarePublishableKey();
  if (fromCloudflare.value) return fromCloudflare;

  return readProcessPublishableKey();
};

export function getStripePublishableKey(): string | null {
  const resolved = resolvePublishableKey();
  if (!resolved.value) return null;

  // Never expose secret keys to the browser.
  if (!resolved.value.startsWith("pk_")) {
    console.error(
      "[stripe] invalid publishable key type. Expected pk_*.",
      `source=${resolved.source ?? "unknown"}`,
      `type=${classifyKey(resolved.value)}`,
    );
    return null;
  }

  return resolved.value;
}

export function getStripePublishableKeyDebugInfo() {
  const cloudflare = readCloudflarePublishableKey();
  const processValue = readProcessPublishableKey();
  const selected = resolvePublishableKey();
  return {
    selectedSource: selected.source ?? null,
    selectedType: classifyKey(selected.value),
    cloudflareSource: cloudflare.source ?? null,
    cloudflareType: classifyKey(cloudflare.value),
    processSource: processValue.source ?? null,
    processType: classifyKey(processValue.value),
  };
}

