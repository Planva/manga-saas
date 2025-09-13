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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BillingPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/sign-in");

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
          <div className="rounded-lg border border-emerald-600/40 bg-emerald-900/20 p-3 text-sm text-emerald-300">
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
