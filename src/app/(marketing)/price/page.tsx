import { checkout } from './server-actions';

type Tab = 'pack' | 'subscription';

function Toggle({ tab }: { tab: Tab }) {
  return (
    <div className="mx-auto mt-8 flex w-full max-w-md overflow-hidden rounded-full bg-neutral-800 p-1 shadow-lg">
      <a
        href="/price?tab=pack"
        className={`flex-1 rounded-full py-2 text-center text-sm font-medium transition ${
          tab === 'pack'
            ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white'
            : 'hover:bg-neutral-700 text-gray-300'
        }`}
      >
        Pay Per Use
      </a>
      <a
        href="/price?tab=subscription"
        className={`flex-1 rounded-full py-2 text-center text-sm font-medium transition ${
          tab === 'subscription'
            ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white'
            : 'hover:bg-neutral-700 text-gray-300'
        }`}
      >
        Subscription
      </a>
    </div>
  );
}

function Card(props: {
  title: string;
  price: string;
  subtitle: string;
  highlight?: boolean;
  actionLabel: string;
  action: (fd: FormData) => Promise<void>;
}) {
  const { title, price, subtitle, highlight, actionLabel, action } = props;
  return (
    <div
      className={`relative rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl ${
        highlight ? 'ring-1 ring-fuchsia-500/40' : ''
      }`}
    >
      {highlight && (
        <span className="absolute right-4 top-4 rounded-full bg-fuchsia-600/20 px-3 py-1 text-xs text-fuchsia-300">
          Popular
        </span>
      )}
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-4xl font-bold">{price}</div>
      <div className="mt-1 text-xs text-gray-400">{subtitle}</div>

      <ul className="mt-5 space-y-2 text-sm text-gray-300">
        <li className="flex items-start gap-2">
          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Priority OCR & translation pipeline
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Multiple models (Offline, Sugoi, NLLB, M2M100, GPT-4o..)
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Works on website and plugin
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Credits never expire
        </li>
      </ul>

      <form action={action} className="mt-6">
        <button className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg hover:opacity-95">
          {actionLabel}
        </button>
      </form>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  // Next 15：动态 API 需要 Promise + await
  searchParams: Promise<{ tab?: 'pack' | 'subscription' }>;
}) {
  // 1) 先 await 再取值
  const { tab: tabRaw } = await searchParams;

  // 2) 读取开关（不配就是默认开启）
  const ENABLE_PACKS = process.env.FEATURE_ENABLE_PACKS !== 'false';
  const ENABLE_SUBS =
    process.env.FEATURE_ENABLE_SUBSCRIPTIONS !== 'false';

  // 3) 计算当前 tab（只开一个时就固定到那个）
  let tab: Tab;
  if (ENABLE_PACKS && ENABLE_SUBS) {
    tab = tabRaw === 'subscription' ? 'subscription' : 'pack';
  } else if (ENABLE_SUBS) {
    tab = 'subscription';
  } else {
    tab = 'pack';
  }

  // 4) 价格 ID（服务端读 env）
  const PACK_STARTER = process.env.NEXT_PUBLIC_STRIPE_PACK_STARTER!;
  const PACK_STANDARD = process.env.NEXT_PUBLIC_STRIPE_PACK_STANDARD!;
  const PACK_BULK = process.env.NEXT_PUBLIC_STRIPE_PACK_BULK!;
  const SUB_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_SUB_MONTHLY!;
  const SUB_YEARLY = process.env.NEXT_PUBLIC_STRIPE_SUB_YEARLY!;

  // 5) 绑定 Server Actions（SSR 提交后端创建 Checkout）
  const buyStarter = checkout.bind(null, { kind: 'pack', priceId: PACK_STARTER });
  const buyStandard = checkout.bind(null, { kind: 'pack', priceId: PACK_STANDARD });
  const buyBulk = checkout.bind(null, { kind: 'pack', priceId: PACK_BULK });
  const subMonthly = checkout.bind(null, { kind: 'subscription', priceId: SUB_MONTHLY });
  const subYearly = checkout.bind(null, { kind: 'subscription', priceId: SUB_YEARLY });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 text-gray-100">
      <h1 className="text-center text-4xl font-bold">Simple Pricing</h1>
      <p className="mt-3 text-center text-sm text-gray-400">
        Choose the plan that works for you — pay-per-use packs or monthly/yearly subscriptions.
      </p>

      {/* 两种都开时才显示切换条 */}
      {ENABLE_PACKS && ENABLE_SUBS ? <Toggle tab={tab} /> : null}

      {/* 一次性购买 */}
      {ENABLE_PACKS && (tab === 'pack' || !ENABLE_SUBS) && (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card title="Starter Pack" price="$6.90" subtitle="≈ 300 translations" actionLabel="Get Started" action={buyStarter} />
          <Card title="Standard Pack" price="$19.90" subtitle="≈ 1,000 translations" highlight actionLabel="Get Started" action={buyStandard} />
          <Card title="Bulk Pack" price="$24.90" subtitle="≈ 1,200 translations" actionLabel="Get Started" action={buyBulk} />
        </div>
      )}

      {/* 订阅 */}
      {ENABLE_SUBS && (tab === 'subscription' || !ENABLE_PACKS) && (
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card title="Monthly" price="$19.90" subtitle="1,200 credits / month · rollover" actionLabel="Subscribe Monthly" action={subMonthly} />
          <Card title="Yearly" price="$199.90" subtitle="16,000 credits / year · rollover" highlight actionLabel="Subscribe Yearly" action={subYearly} />
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-sm text-gray-400">
        <div className="mb-2 font-semibold text-gray-200">Security & Privacy</div>
        <p>
          Payments are processed by Stripe. Your card details never touch our servers. You can manage or cancel your subscription anytime via the billing portal.
        </p>
      </div>
    </div>
  );
}
