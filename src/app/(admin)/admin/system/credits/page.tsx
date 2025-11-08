import type { Metadata } from "next";

import { getSystemSettings } from "@/utils/system-settings";
import { CreditSettingsForm } from "./_components/credit-settings-form";

export const metadata: Metadata = {
  title: "积分与额度设置",
  description: "配置一次性/订阅开关、无限模式、每日赠送与游客限额。",
};

export default async function CreditSettingsPage() {
  const settings = await getSystemSettings();

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">积分设置</h1>
        <p className="text-sm text-muted-foreground">
          在这里调整一次性与订阅套餐的开关、订阅无限使用策略、每日赠送积分以及游客限额。
        </p>
      </div>

      <CreditSettingsForm initialSettings={settings} />
    </div>
  );
}
