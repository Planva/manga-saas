// src/app/api/stripe/webhook/route.ts
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

import { getDB } from "@/db";
import { eq } from "drizzle-orm";
import { userTable } from "@/db/schema";
import { stripeCustomerMapTable } from "@/db/schema";
import { updateUserCredits } from "@/utils/credits";
import { PRICE_TO_CREDITS } from "@/config/price-to-credits";

// 订阅“无限使用”相关开关（你之前就有）
const MODE = (process.env.FEATURE_SUBS_UNLIMITED_MODE ?? "off") as
  | "off"
  | "monthly"
  | "yearly"
  | "all";
const ALSO_GRANT = process.env.FEATURE_SUBS_UNLIMITED_ALSO_GRANT_CREDITS === "true";

const SUB_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_SUB_MONTHLY!;
const SUB_YEARLY = process.env.NEXT_PUBLIC_STRIPE_SUB_YEARLY!;

function unlimitedEnabledFor(priceId: string | undefined) {
  if (!priceId) return false;
  if (MODE === "off") return false;
  if (MODE === "all") return priceId === SUB_MONTHLY || priceId === SUB_YEARLY;
  if (MODE === "monthly") return priceId === SUB_MONTHLY;
  if (MODE === "yearly") return priceId === SUB_YEARLY;
  return false;
}

async function setUnlimitedUntil(userId: string, untilUnixSec: number) {
  const db = getDB();
  await db
    .update(userTable)
    .set({
      unlimitedUsageUntil: untilUnixSec,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));
}

/** 写入/查询 customerId<->userId 映射 */
async function ensureStripeCustomerMap(userId: string, customerId?: string | null) {
  if (!customerId) return;
  const db = getDB();

  const exists = await db
    .select({ userId: stripeCustomerMapTable.userId })
    .from(stripeCustomerMapTable)
    .where(eq(stripeCustomerMapTable.customerId, customerId))
    .get();

  if (!exists) {
    await db.insert(stripeCustomerMapTable).values({
      customerId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

async function getUserIdByCustomer(customerId?: string | null): Promise<string | undefined> {
  if (!customerId) return undefined;
  const db = getDB();
  const row = await db
    .select({ userId: stripeCustomerMapTable.userId })
    .from(stripeCustomerMapTable)
    .where(eq(stripeCustomerMapTable.customerId, customerId))
    .get();
  return row?.userId;
}

async function getUserIdByEmail(email?: string | null): Promise<string | undefined> {
  if (!email) return undefined;
  const db = getDB();
  const row = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email))
    .get();
  return row?.id;
}

export const runtime = "edge";

export async function POST(req: Request) {
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return new Response(`Bad signature: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      /** 1) Checkout 完成
       * - 一次性包：这里直接发积分
       * - 订阅：只建立 customer 映射&（可选）设置无限使用；发积分走 invoice.payment_succeeded
       */
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;

        const mode = s.mode; // 'payment' | 'subscription'
        const priceId =
          (s?.line_items as any)?.data?.[0]?.price?.id ||
          (s?.display_items as any)?.[0]?.price?.id ||
          (s?.metadata?.priceId as string | undefined);

        // 优先元数据 userId；否则用邮箱找
        let userId =
          (s.metadata?.userId as string | undefined) ||
          (await getUserIdByEmail(s.customer_details?.email || s.customer_email));

        // —— 订阅：保存映射（cus_xxx -> userId），并根据开关设置无限使用截止
        if (mode === "subscription") {
          if (userId && s.customer) {
            await ensureStripeCustomerMap(userId, s.customer as string);
          }

          if (userId && unlimitedEnabledFor(priceId) && s.subscription) {
            const sub = await stripe.subscriptions.retrieve(s.subscription as string);
            await setUnlimitedUntil(userId, sub.current_period_end);
          }

          // 订阅的“发积分”不在这里做，留到 invoice.payment_succeeded，避免双发
          break;
        }

        // —— 一次性包：这里直接发积分
        if (mode === "payment") {
          if (!userId) {
            // 尝试从 customer 反查映射
            userId = await getUserIdByCustomer(s.customer as string);
          }
          const credits = priceId ? PRICE_TO_CREDITS[priceId] ?? 0 : 0;
          if (userId && credits > 0) {
            await updateUserCredits(userId, credits);
          }
        }
        break;
      }

      /** 2) 每期扣款成功（订阅续费/首期生成发票也会触发）：这里发积分 + （可选）刷新无限使用截止 */
      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        const priceId = inv.lines.data[0]?.price?.id as string | undefined;
        const credits = priceId ? PRICE_TO_CREDITS[priceId] ?? 0 : 0;

        // 定位 userId：customer 映射 -> subscription.metadata -> 邮箱兜底
        let userId =
          (await getUserIdByCustomer(inv.customer as string)) ||
          (inv.subscription
            ? (await stripe.subscriptions.retrieve(inv.subscription as string)).metadata
                ?.userId
            : undefined) ||
          (await getUserIdByEmail(inv.customer_email as string | undefined));

        if (!userId) {
          // 实在找不到就跳过（返回 200 防止 Stripe 重试风暴）
          break;
        }

        // （可选）无限模式：刷新截止时间
        if (unlimitedEnabledFor(priceId) && inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
          await setUnlimitedUntil(userId, sub.current_period_end);
        }

        // 发积分（当无限模式关闭或希望“同时发积分”）
        if (credits > 0 && (!unlimitedEnabledFor(priceId) || ALSO_GRANT)) {
          await updateUserCredits(userId, credits);
        }
        break;
      }

      /** 3) 订阅状态变化：同步无限使用截止（取消/过期时清零） */
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price?.id as string | undefined;

        // 尽量确定 userId：订阅 metadata -> customer 映射
        const metadataUserId = sub.metadata?.userId as string | undefined;
        const mappedUserId =
          metadataUserId || (await getUserIdByCustomer(sub.customer as string));

        if (mappedUserId && unlimitedEnabledFor(priceId)) {
          const until =
            sub.status === "active" || sub.status === "trialing"
              ? sub.current_period_end
              : 0;
          await setUnlimitedUntil(mappedUserId, until);
        }
        break;
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err: any) {
    // 避免 Stripe 无限重试，这里只在真正异常时返回 500
    console.error("Webhook error:", err);
    return new Response(`error: ${err.message}`, { status: 500 });
  }
}
