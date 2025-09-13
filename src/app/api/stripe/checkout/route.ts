// app/api/stripe/checkout/route.ts
import { getStripe } from '@/lib/stripe'
import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth'; // use your existing auth util
const stripe = getStripe();
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { kind, priceId } = (await req.json()) as {
    kind: 'pack' | 'subscription';
    priceId: string;
  };
  if (!priceId) return new Response('Missing priceId', { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  // If you already store stripeCustomerId on user, pass customer: user.stripeCustomerId
  const session = await stripe.checkout.sessions.create({
    mode: kind === 'subscription' ? 'subscription' : 'payment',
    customer_email: user.email, // or customer: 'cus_xxx'
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/price?status=success`,
    cancel_url: `${siteUrl}/price?status=cancel`,
    allow_promotion_codes: true,
    metadata: { userId: String(user.id), kind, priceId },
  });

  return Response.json({ url: session.url });
}