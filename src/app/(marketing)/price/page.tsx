<<<<<<< HEAD
=======
// src/app/(marketing)/price/page.tsx
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import BuyButton from "./_components/buy-button.client";
<<<<<<< HEAD
import { getSystemSettings } from "@/utils/system-settings";
=======
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2

type Tab = "pack" | "subscription";

function Toggle({ tab }: { tab: Tab }) {
  return (
    <div className="mx-auto mt-8 flex w-full max-w-md overflow-hidden rounded-full bg-muted p-1 shadow-sm">
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
  actionLabel: string;
  kind: "pack" | "subscription";
  priceId: string;
}) {
  const { title, price, subtitle, highlight, actionLabel, kind, priceId } = props;

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
<<<<<<< HEAD
  searchParams: Promise<{ tab?: "pack" | "subscription" }>;
}) {
  const [{ tab: tabRaw }, settings] = await Promise.all([
    searchParams,
    getSystemSettings(),
  ]);

  const enablePacks = settings.enablePacks;
  const enableSubs = settings.enableSubscriptions;

  const packPriceIds = {
    starter: settings.stripePrices.packStarter,
    standard: settings.stripePrices.packStandard,
    bulk: settings.stripePrices.packBulk,
  };

  const subsPriceIds = {
    monthly: settings.stripePrices.subMonthly,
    yearly: settings.stripePrices.subYearly,
  };

  const hasPackProducts = enablePacks && Object.values(packPriceIds).some(Boolean);
  const hasSubscriptionProducts = enableSubs && Object.values(subsPriceIds).some(Boolean);

  let tab: Tab;
  if (hasPackProducts && hasSubscriptionProducts) {
    tab = tabRaw === "subscription" ? "subscription" : "pack";
  } else if (hasSubscriptionProducts) {
=======
  // Next 15: searchParams 是 Promise，需要 await
  searchParams: Promise<{ tab?: "pack" | "subscription" }>;
}) {
  // 1) 读取 tab
  const { tab: tabRaw } = await searchParams;

  // 2) 按配置判断显示
  const ENABLE_PACKS = process.env.FEATURE_ENABLE_PACKS !== "false";
  const ENABLE_SUBS = process.env.FEATURE_ENABLE_SUBSCRIPTIONS !== "false";

  let tab: Tab;
  if (ENABLE_PACKS && ENABLE_SUBS) {
    tab = tabRaw === "subscription" ? "subscription" : "pack";
  } else if (ENABLE_SUBS) {
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
    tab = "subscription";
  } else {
    tab = "pack";
  }

<<<<<<< HEAD
  const showToggle = hasPackProducts && hasSubscriptionProducts;
=======
  // 3) Stripe 价格 ID（保持功能不变）
  const PACK_STARTER = process.env.NEXT_PUBLIC_STRIPE_PACK_STARTER!;
  const PACK_STANDARD = process.env.NEXT_PUBLIC_STRIPE_PACK_STANDARD!;
  const PACK_BULK = process.env.NEXT_PUBLIC_STRIPE_PACK_BULK!;
  const SUB_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_SUB_MONTHLY!;
  const SUB_YEARLY = process.env.NEXT_PUBLIC_STRIPE_SUB_YEARLY!;
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-center text-4xl font-bold text-foreground">Simple Pricing</h1>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Choose the plan that works for you — pay-per-use packs or monthly/yearly subscriptions.
      </p>

<<<<<<< HEAD
      {showToggle ? <Toggle tab={tab} /> : null}

      {hasPackProducts && (tab === "pack" || !hasSubscriptionProducts) && (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {packPriceIds.starter && (
            <Card
              title="Starter Pack"
              price="$6.90"
              subtitle="≈300 translations"
              actionLabel="Get Started"
              kind="pack"
              priceId={packPriceIds.starter}
            />
          )}
          {packPriceIds.standard && (
            <Card
              title="Standard Pack"
              price="$19.90"
              subtitle="≈1,000 translations"
              highlight
              actionLabel="Get Started"
              kind="pack"
              priceId={packPriceIds.standard}
            />
          )}
          {packPriceIds.bulk && (
            <Card
              title="Bulk Pack"
              price="$24.90"
              subtitle="≈1,200 translations"
              actionLabel="Get Started"
              kind="pack"
              priceId={packPriceIds.bulk}
            />
          )}

          {!Object.values(packPriceIds).some(Boolean) && (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground md:col-span-3">
              No pack products are configured. Add Stripe price IDs in the admin panel to offer one-time purchases.
            </div>
          )}
        </div>
      )}

      {hasSubscriptionProducts && (tab === "subscription" || !hasPackProducts) && (
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          {subsPriceIds.monthly && (
            <Card
              title="Monthly"
              price="$19.90"
              subtitle="1,200 credits / month · rollover"
              actionLabel="Subscribe Monthly"
              kind="subscription"
              priceId={subsPriceIds.monthly}
            />
          )}
          {subsPriceIds.yearly && (
            <Card
              title="Yearly"
              price="$199.90"
              subtitle="16,000 credits / year · rollover"
              highlight
              actionLabel="Subscribe Yearly"
              kind="subscription"
              priceId={subsPriceIds.yearly}
            />
          )}

          {!Object.values(subsPriceIds).some(Boolean) && (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground md:col-span-2">
              No subscription products are configured. Provide Stripe subscription price IDs in the admin panel to enable recurring plans.
            </div>
          )}
        </div>
      )}

      {!hasPackProducts && !hasSubscriptionProducts && (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Pricing is currently hidden because no Stripe price IDs are configured. Update the values in the admin credit settings page to publish plans.
=======
      {/* 两种都开时才显示切换条 */}
      {ENABLE_PACKS && ENABLE_SUBS ? <Toggle tab={tab} /> : null}

      {/* 一次性购买 */}
      {ENABLE_PACKS && (tab === "pack" || !ENABLE_SUBS) && (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card
            title="Starter Pack"
            price="$6.90"
            subtitle="≈ 300 translations"
            actionLabel="Get Started"
            kind="pack"
            priceId={PACK_STARTER}
          />
          <Card
            title="Standard Pack"
            price="$19.90"
            subtitle="≈ 1,000 translations"
            highlight
            actionLabel="Get Started"
            kind="pack"
            priceId={PACK_STANDARD}
          />
          <Card
            title="Bulk Pack"
            price="$24.90"
            subtitle="≈ 1,200 translations"
            actionLabel="Get Started"
            kind="pack"
            priceId={PACK_BULK}
          />
        </div>
      )}

      {/* 订阅 */}
      {ENABLE_SUBS && (tab === "subscription" || !ENABLE_PACKS) && (
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card
            title="Monthly"
            price="$19.90"
            subtitle="1,200 credits / month · rollover"
            actionLabel="Subscribe Monthly"
            kind="subscription"
            priceId={SUB_MONTHLY}
          />
          <Card
            title="Yearly"
            price="$199.90"
            subtitle="16,000 credits / year · rollover"
            highlight
            actionLabel="Subscribe Yearly"
            kind="subscription"
            priceId={SUB_YEARLY}
          />
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
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
