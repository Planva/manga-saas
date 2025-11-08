"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSystemSettingsAction } from "../_actions/update-system-settings.action";
import type { SystemSettings } from "@/utils/system-settings";

const schema = z.object({
  enablePacks: z.boolean(),
  enableSubscriptions: z.boolean(),
  subsUnlimitedMode: z.enum(["off", "monthly", "yearly", "all"]),
  subsUnlimitedAlsoGrantCredits: z.boolean(),
  dailyFreeCreditsEnabled: z.boolean(),
  dailyFreeCredits: z.coerce.number().int().min(0).max(1_000_000),
  dailyFreeReset: z.boolean(),
  perUseCreditCost: z.coerce.number().int().min(0).max(1_000_000),
  guestDailyFreeEnabled: z.boolean(),
  guestDailyFreeCredits: z.coerce.number().int().min(0).max(1_000_000),
  guestIpDailyLimit: z.coerce.number().int().min(0).max(1_000_000),
  guestDeviceDailyLimit: z.coerce.number().int().min(0).max(1_000_000),
  guestIpDailyCap: z.coerce.number().int().min(0).max(1_000_000),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  initialSettings: SystemSettings;
};

const settingsToFormValues = (settings: SystemSettings): FormValues => ({
  enablePacks: settings.enablePacks,
  enableSubscriptions: settings.enableSubscriptions,
  subsUnlimitedMode: settings.subsUnlimitedMode,
  subsUnlimitedAlsoGrantCredits: settings.subsUnlimitedAlsoGrantCredits,
  dailyFreeCreditsEnabled: settings.dailyFreeCreditsEnabled,
  dailyFreeCredits: settings.dailyFreeCredits,
  dailyFreeReset: settings.dailyFreeReset,
  perUseCreditCost: settings.perUseCreditCost,
  guestDailyFreeEnabled: settings.guestDailyFreeEnabled,
  guestDailyFreeCredits: settings.guestDailyFreeCredits,
  guestIpDailyLimit: settings.guestIpDailyLimit,
  guestDeviceDailyLimit: settings.guestDeviceDailyLimit,
  guestIpDailyCap: settings.guestIpDailyCap,
});

export function CreditSettingsForm({ initialSettings }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: settingsToFormValues(initialSettings),
  });

  const { execute, status } = useServerAction(updateSystemSettingsAction, {
    onSuccess: ({ data }) => {
      if (data?.settings) {
        form.reset(settingsToFormValues(data.settings));
      }
      toast.success("设置已保存");
    },
    onError: (error) => {
      toast.error(error.err?.message ?? "保存失败，请稍后再试");
    },
  });

  const handleSubmit = (values: FormValues) => {
    execute(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6 max-w-3xl">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">支付产品开关</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            控制是否向用户展示一次性套餐和订阅套餐。价格 ID 仍保留在 .env 中。
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="enablePacks"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      ref={field.ref}
                      className="mt-1 h-5 w-5 cursor-pointer accent-primary"
                    />
                  </FormControl>
                  <div>
                    <FormLabel className="text-base">开启一次性套餐</FormLabel>
                    <FormDescription>关闭后，前台不会展示任何一次性积分包。</FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enableSubscriptions"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      ref={field.ref}
                      className="mt-1 h-5 w-5 cursor-pointer accent-primary"
                    />
                  </FormControl>
                  <div>
                    <FormLabel className="text-base">开启订阅套餐</FormLabel>
                    <FormDescription>关闭后，用户无法购买任何订阅产品。</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="subsUnlimitedMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>订阅无限用模式</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择模式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">关闭</SelectItem>
                        <SelectItem value="monthly">仅限月付订阅</SelectItem>
                        <SelectItem value="yearly">仅限年付订阅</SelectItem>
                        <SelectItem value="all">月付与年付均开启</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>决定哪些订阅在付费期间拥有无限使用权。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subsUnlimitedAlsoGrantCredits"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      ref={field.ref}
                      className="mt-1 h-5 w-5 cursor-pointer accent-primary"
                    />
                  </FormControl>
                  <div>
                    <FormLabel className="text-base">无限期同时发放积分</FormLabel>
                    <FormDescription>开启后，即使订阅已享无限使用，仍按原计划发放积分。</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">积分发放与单次消耗</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            配置每日赠送积分策略以及默认扣费额度。
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="dailyFreeCreditsEnabled"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 rounded-lg border border-border bg-background p-4 md:col-span-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      ref={field.ref}
                      className="mt-1 h-5 w-5 cursor-pointer accent-primary"
                    />
                  </FormControl>
                  <div>
                    <FormLabel className="text-base">启用每日赠送积分</FormLabel>
                    <FormDescription>每天为登录用户自动发放固定积分。</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dailyFreeCredits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>登录用户每日赠送数量</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={1_000_000} {...field} />
                  </FormControl>
                  <FormDescription>默认 10，根据业务需求调整。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dailyFreeReset"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      ref={field.ref}
                      className="mt-1 h-5 w-5 cursor-pointer accent-primary"
                    />
                  </FormControl>
                  <div>
                    <FormLabel className="text-base">清空未使用赠送积分</FormLabel>
                    <FormDescription>开启后，新的赠送积分会在清零旧额度后发放。</FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="perUseCreditCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>默认单次消耗</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={1_000_000} {...field} />
                  </FormControl>
                  <FormDescription>用于测试按钮或通用扣费逻辑。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">游客限额</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            控制未登录用户的免费额度和滥用限制。
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="guestDailyFreeEnabled"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 rounded-lg border border-border bg-background p-4 md:col-span-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      ref={field.ref}
                      className="mt-1 h-5 w-5 cursor-pointer accent-primary"
                    />
                  </FormControl>
                  <div>
                    <FormLabel className="text-base">游客每日免费额度</FormLabel>
                    <FormDescription>允许未登录用户每天领取固定次数。</FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guestDailyFreeCredits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>游客每日积分数</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={1_000_000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guestIpDailyLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>同 IP 每日上限</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={1_000_000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guestDeviceDailyLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>同设备每日上限</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={1_000_000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guestIpDailyCap"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IP 总额度上限</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={1_000_000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={status === "pending"}>
            {status === "pending" ? "保存中…" : "保存更改"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
