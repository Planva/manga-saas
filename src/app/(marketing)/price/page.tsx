export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import BuyButton from "./_components/buy-button.client";
import { getSystemSettings } from "@/utils/system-settings";
import { MobilePriceScrollContainer } from "./_components/mobile-price-scroll-container";
import { getMarketingPricingPlans } from "@/config/marketing-pricing-plans";

type Tab = "pack" | "subscription";

function Toggle({ tab }: { tab: Tab }) {
  return (
    <div className="mx-auto mt-8 mb-8 flex w-full max-w-md overflow-hidden rounded-full bg-muted p-1 shadow-sm">
      <Link
        href="/price?tab=pack"
        prefetch={false}
        className={[
          "flex-1 rounded-full py-2 text-center text-sm font-medium transition",
          tab === "pack"
            ? "bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        ].join(" ")}
      >
        Pay Per Use
      </Link>
      <Link
        href="/price?tab=subscription"
        prefetch={false}
        className={[
          "flex-1 rounded-full py-2 text-center text-sm font-medium transition",
          tab === "subscription"
            ? "bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        ].join(" ")}
      >
        Subscription
      </Link>
    </div>
  );
}

function Card(props: {
  title: string;
  price: string;
  subtitle: string;
  highlight?: boolean;
  kind: "pack" | "subscription";
  priceId: string;
}) {
  const { title, price, subtitle, highlight, kind, priceId } = props;

  return (
    <div
      className={[
        "relative rounded-2xl border border-border bg-card text-card-foreground p-6",
        "shadow-sm transition-shadow hover:shadow-md",
        highlight ? "ring-1 ring-fuchsia-500/20 dark:ring-fuchsia-500/40" : "",
      ].join(" ")}
    >
      {highlight && (
        <span className="absolute right-4 top-4 rounded-full bg-fuchsia-600/15 px-3 py-1 text-xs text-fuchsia-600 dark:text-fuchsia-300">
          Popular
        </span>
      )}

      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-4xl font-bold">{price}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>

      <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          Priority OCR &amp; translation pipeline
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          Multiple models (Offline, Sugoi, NLLB, M2M100, GPT-4o..)
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          Works on website and plugin
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          Credits never expire
        </li>
      </ul>

      <div className="mt-5">
        <BuyButton
          kind={kind}
          priceId={priceId}
          label={kind === "subscription" ? "Subscribe" : "Purchase Now"}
          className="w-full"
        />
      </div>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: "pack" | "subscription" }>;
}) {
  const [{ tab: tabRaw }, settings] = await Promise.all([
    searchParams,
    getSystemSettings(),
  ]);

  const enablePacks = settings.enablePacks;
  const enableSubs = settings.enableSubscriptions;

  const { packs, subscriptions } = getMarketingPricingPlans(settings);
  const hasPackProducts = enablePacks && packs.length > 0;
  const hasSubscriptionProducts = enableSubs && subscriptions.length > 0;

  let tab: Tab;
  if (hasPackProducts && hasSubscriptionProducts) {
    tab = tabRaw === "subscription" ? "subscription" : "pack";
  } else if (hasSubscriptionProducts) {
    tab = "subscription";
  } else {
    tab = "pack";
  }

  const showToggle = hasPackProducts && hasSubscriptionProducts;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-center text-4xl font-bold text-foreground">Simple Pricing</h1>
      <h2 className="mt-3 text-center text-sm text-muted-foreground font-normal">
        Choose the plan that works for you — pay-per-use packs or monthly/yearly subscriptions.
      </h2>

      {showToggle ? <Toggle tab={tab} /> : null}

      {hasPackProducts && (tab === "pack" || !hasSubscriptionProducts) && (
        <MobilePriceScrollContainer className="md:grid-cols-3">
          {packs.map((plan) => (
            <div
              key={plan.priceId}
              className="min-w-[85vw] md:min-w-0 snap-center"
              data-highlight={plan.highlight ? "true" : undefined}
            >
              <Card
                title={plan.title}
                price={plan.price}
                subtitle={plan.subtitle}
                highlight={plan.highlight}
                kind={plan.kind}
                priceId={plan.priceId}
              />
            </div>
          ))}
        </MobilePriceScrollContainer>
      )}

      {hasSubscriptionProducts && (tab === "subscription" || !hasPackProducts) && (
        <MobilePriceScrollContainer className="mt-16 md:grid-cols-2">
          {subscriptions.map((plan) => (
            <div
              key={plan.priceId}
              className="min-w-[85vw] md:min-w-0 snap-center"
              data-highlight={plan.highlight ? "true" : undefined}
            >
              <Card
                title={plan.title}
                price={plan.price}
                subtitle={plan.subtitle}
                highlight={plan.highlight}
                kind={plan.kind}
                priceId={plan.priceId}
              />
            </div>
          ))}
        </MobilePriceScrollContainer>
      )}

      {!hasPackProducts && !hasSubscriptionProducts && (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Pricing is currently hidden because no Stripe price IDs are configured. Set the Stripe price IDs in your .env file to publish plans.
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <div className="mb-2 font-semibold text-foreground">Security &amp; Privacy</div>
        <p>
          Payments are processed by Stripe. Your card details never touch our servers.
          You can manage or cancel your subscription anytime via the billing portal.
        </p>
      </div>
    </div>
  );
}
