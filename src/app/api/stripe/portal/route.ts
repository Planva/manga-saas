// app/api/stripe/portal/route.ts
import { stripe } from '@/src/lib/stripe';
import { getCurrentUser } from '@/src/lib/auth';

export const runtime = 'edge';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // If you persist stripeCustomerId, use it. Otherwise, search by email (works if unique)
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) return new Response('No Stripe customer', { status: 404 });

  const returnUrl =
    process.env.STRIPE_PORTAL_RETURN_URL ??
    (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000') + '/dashboard/billing';

  const portal = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: returnUrl,
  });

  return Response.json({ url: portal.url });
}