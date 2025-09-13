// src/app/(marketing)/price/server-actions.ts
'use server';
import { redirect } from 'next/navigation';
import { getStripe } from '@/lib/stripe';
import { getSessionFromCookie } from '@/utils/auth';

const ENABLE_PACKS = process.env.FEATURE_ENABLE_PACKS !== 'false';
const ENABLE_SUBS  = process.env.FEATURE_ENABLE_SUBSCRIPTIONS !== 'false';

export async function checkout(
  { kind, priceId }: { kind: 'pack' | 'subscription'; priceId: string }
) {
  if ((kind === 'pack' && !ENABLE_PACKS) || (kind === 'subscription' && !ENABLE_SUBS)) {
    throw new Error('This payment mode is disabled');
  }

  const session = await getSessionFromCookie();
  if (!session?.user) redirect('/sign-in?next=/price');

  const stripe = getStripe();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const s = await stripe.checkout.sessions.create({
    mode: kind === 'subscription' ? 'subscription' : 'payment',
    customer_email: session.user.email!,
    line_items: [{ price: priceId, quantity: 1 }],
    // ✅ 支付完成回到 Billing
    success_url: `${siteUrl}/dashboard/billing?status=success&kind=${kind}&session_id={CHECKOUT_SESSION_ID}`,
    // （可选）取消也回 Billing，避免用户在 price 页困惑
    cancel_url:  `${siteUrl}/dashboard/billing?status=cancel&kind=${kind}`,
    allow_promotion_codes: true,
    metadata: { userId: String(session.user.id), kind, priceId },
  });

  redirect(s.url!);
}
