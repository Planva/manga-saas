// src/app/api/stripe/portal/route.ts
import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/utils/auth";
import { getStripe } from "@/lib/stripe";
import { getDB } from "@/db";
import { userTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function POST(req: Request) {
  const session = await getSessionFromCookie();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/sign-in?next=/dashboard/billing", req.url));
  }
  const userId = String(session.user.id);

  const db = getDB();
  const u = await db
    .select({ email: userTable.email, stripeCustomerId: userTable.stripeCustomerId })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .get();

  const stripe = getStripe();
  let customerId = (u?.stripeCustomerId as string | undefined) ?? undefined;

  // 没有保存过 customerId：用邮箱在 Stripe 查找，否则新建一个
  if (!customerId) {
    const email = u?.email || session.user.email!;
    const found = await stripe.customers.list({ email, limit: 1 });
    customerId = found.data[0]?.id ?? (await stripe.customers.create({ email, metadata: { userId } })).id;

    await db
      .update(userTable)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(userTable.id, userId));
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL ?? `${siteUrl}/dashboard/billing`;

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId!,
    return_url: returnUrl,
  });

  // 303 更合适（POST -> GET）
  return NextResponse.redirect(portal.url, { status: 303 });
}
