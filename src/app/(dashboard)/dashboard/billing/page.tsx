import { getSessionFromCookie } from "@/utils/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TransactionHistory } from "./_components/transaction-history";
import { CreditPackages } from "./_components/credit-packages";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { db } from "@/db";
import { userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import SubscriptionCard from "./_components/subscription-card";
import { logUserEvent } from "@/utils/user-events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!db) {
    throw new Error("Database connection is not available");
  }

  const session = await getSessionFromCookie();
  if (!session) redirect("/sign-in");
  const sp = (await searchParams) ?? {};

  const status =
    typeof sp.status === "string" ? sp.status : undefined;
  const kind =
    typeof sp.kind === "string" ? sp.kind : undefined;
  const checkoutSessionId =
    typeof sp.session_id === "string" ? sp.session_id : undefined;

  if (status === "success" || status === "cancel") {
    await logUserEvent({
      eventType: status === "success" ? "checkout_return_success" : "checkout_return_cancelled",
      userId: String(session.user.id),
      email: session.user.email ?? null,
      metadata: {
        kind,
        sessionId: checkoutSessionId,
      },
    }).catch((error) => {
      console.error("[billing] failed to record checkout return event", error);
    });

    redirect("/dashboard/billing");
  }

  const row = await db
    .select({ u: userTable.unlimitedUsageUntil })
    .from(userTable)
    .where(eq(userTable.id, session.user.id as string))
    .get();

  const unlimitedUntil = (row?.u as number) ?? 0;
  const unlimitedActive = unlimitedUntil >= Math.floor(Date.now() / 1000);

  return (
    <>
      <PageHeader
        items={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/dashboard/billing", label: "Billing" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {unlimitedActive && (
          <div
          role="status"
          className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800
                     dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-100">
            Unlimited usage is active until {new Date(unlimitedUntil * 1000).toLocaleString()}.
          </div>
        )}

        <SubscriptionCard />

        <CreditPackages />

        <div className="mt-4">
          <NuqsAdapter>
            <TransactionHistory />
          </NuqsAdapter>
        </div>
      </div>
    </>
  );
}
