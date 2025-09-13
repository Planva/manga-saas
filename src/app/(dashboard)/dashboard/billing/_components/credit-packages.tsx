// Server Component（不要 "use client"）
import { checkout } from "@/app/(marketing)/price/server-actions";
import { getStripe } from "@/lib/stripe";
import { getSessionFromCookie } from "@/utils/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FREE_MONTHLY_CREDITS } from "@/constants";

type Product = {
  priceId: string;
  kind: "pack" | "subscription";
  title: string;
  subtitle?: string;
  unitAmountText: string;
  badge?: string;
};

function fmtMoney(unitAmount: number | null, currency: string | null) {
  const cents = typeof unitAmount === "number" ? unitAmount : 0;
  const iso = (currency || "usd").toUpperCase();
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: iso,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function readEnvPriceIds() {
  const ids = {
    PACK_STARTER: process.env.NEXT_PUBLIC_STRIPE_PACK_STARTER,
    PACK_STANDARD: process.env.NEXT_PUBLIC_STRIPE_PACK_STANDARD,
    PACK_BULK: process.env.NEXT_PUBLIC_STRIPE_PACK_BULK,
    SUB_MONTHLY: process.env.NEXT_PUBLIC_STRIPE_SUB_MONTHLY,
    SUB_YEARLY: process.env.NEXT_PUBLIC_STRIPE_SUB_YEARLY,
  };
  return Object.fromEntries(
    Object.entries(ids).filter(([, v]) => typeof v === "string" && v)
  ) as Record<string, string>;
}

async function loadProducts(): Promise<Product[]> {
  const env = readEnvPriceIds();
  const pairs = Object.entries(env).map(([key, id]) => ({ key, id }));
  if (!pairs.length) return [];

  const stripe = getStripe();

  const prices = await Promise.all(
    pairs.map(async ({ key, id }) => {
      const p = await stripe.prices.retrieve(id);

      const kind: Product["kind"] =
        p.recurring?.interval ? "subscription" : "pack";

      const nickname = p.nickname?.trim();
      const fallbackTitle =
        key === "PACK_STARTER"
          ? "Starter"
          : key === "PACK_STANDARD"
          ? "Standard"
          : key === "PACK_BULK"
          ? "Bulk"
          : key === "SUB_MONTHLY"
          ? "Monthly"
          : key === "SUB_YEARLY"
          ? "Yearly"
          : "Plan";

      const subtitle =
        kind === "subscription"
          ? p.recurring?.interval === "year"
            ? "Credits per year · rollover"
            : "Credits per month · rollover"
          : undefined;

      const unitAmountText =
        kind === "subscription" && p.recurring?.interval === "month"
          ? `${fmtMoney(p.unit_amount, p.currency)} / mo`
          : kind === "subscription" && p.recurring?.interval === "year"
          ? `${fmtMoney(p.unit_amount, p.currency)} / yr`
          : `${fmtMoney(p.unit_amount, p.currency)}`;

      return {
        priceId: id,
        kind,
        title: nickname || fallbackTitle,
        subtitle,
        unitAmountText,
        badge:
          key === "PACK_STANDARD" || key === "SUB_YEARLY" ? "Popular" : undefined,
      } as Product;
    })
  );

  // 一次性在前、订阅在后
  return [
    ...prices.filter((x) => x.kind === "pack"),
    ...prices.filter((x) => x.kind === "subscription"),
  ];
}

function ProductCard({ p }: { p: Product }) {
  const action = checkout.bind(null, {
    kind: p.kind,
    priceId: p.priceId,
  });

  return (
    <div className="relative w-[280px] shrink-0 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow">
      {p.badge && (
        <span className="absolute right-3 top-3 rounded-full bg-fuchsia-600/20 px-2 py-0.5 text-xs text-fuchsia-300">
          {p.badge}
        </span>
      )}
      <div className="text-sm text-gray-300">
        {p.kind === "subscription" ? "Subscription" : "One-time"}
      </div>
      <div className="mt-1 text-lg font-semibold">{p.title}</div>
      <div className="mt-2 text-3xl font-bold">{p.unitAmountText}</div>
      {p.subtitle && (
        <div className="mt-1 text-xs text-gray-400">{p.subtitle}</div>
      )}

      <form action={action} className="mt-5">
        <button className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95">
          {p.kind === "subscription" ? "Subscribe" : "Purchase Now"}
        </button>
      </form>
    </div>
  );
}

/** 余额卡片（恢复“位置①”显示） */
async function CreditSummaryCard() {
  const session = await getSessionFromCookie();
  if (!session?.user) return null;

  const credits = Number(session.user.currentCredits || 0);

  // 文案：如果开启了每日赠送，就显示每日；否则显示每月常量
  const dailyEnabled = process.env.FEATURE_DAILY_FREE_CREDITS_ENABLED !== "false";
  const dailyAmount = Number(process.env.DAILY_FREE_CREDITS ?? "0") || 0;
  const tip = dailyEnabled && dailyAmount > 0
    ? `You get ${dailyAmount} free credits every day.`
    : `You get ${FREE_MONTHLY_CREDITS} free credits every month.`;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Credits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-bold">{credits.toLocaleString()} credits</div>
        <div className="text-sm text-muted-foreground">{tip}</div>
      </CardContent>
    </Card>
  );
}

export async function CreditPackages() {
  const products = await loadProducts();

  return (
    <>
      {/* 恢复顶部“Credits …”卡片 */}
      <CreditSummaryCard />

      {/* 横向滑动的价格卡片（自动读取 Stripe Price） */}
      {!!products.length && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max pr-4">
              {products.map((p) => (
                <ProductCard key={p.priceId} p={p} />
              ))}
            </div>
          </div>
          <div className="mt-2 text-center text-xs text-gray-500">
            Scroll to see more plans →
          </div>
        </div>
      )}
    </>
  );
}
