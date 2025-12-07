// src/app/(dashboard)/dashboard/billing/_components/subscription-card.tsx
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { getCurrentSubscription } from "../subscription.server";
import { renderStatusLine, renderBadgeText } from "../subscription.shared";
import ManagePortalButton from "./manage-portal-button.client";
export default async function SubscriptionCard() {
  // 直接在服务端拿订阅状态
  const status = await getCurrentSubscription();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-muted-foreground">
          {renderStatusLine(status)}
        </div>
        <div>
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs">
            {renderBadgeText(status)}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <ManagePortalButton />
      </CardFooter>
    </Card>
  );
}
