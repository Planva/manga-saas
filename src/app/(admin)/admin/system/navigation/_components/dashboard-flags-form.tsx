"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";

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
import { updateDashboardFlagsAction } from "../_actions/update-dashboard-flags.action";
import type { SystemSettings } from "@/utils/system-settings";

const schema = z.object({
  home: z.boolean(),
  teams: z.boolean(),
  marketplace: z.boolean(),
  billing: z.boolean(),
  settings: z.boolean(),
  landing: z.string().max(255),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  initialFlags: SystemSettings["dashboard"];
};

export function DashboardFlagsForm({ initialFlags }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      home: initialFlags.home,
      teams: initialFlags.teams,
      marketplace: initialFlags.marketplace,
      billing: initialFlags.billing,
      settings: initialFlags.settings,
      landing: initialFlags.homeRoute,
    },
  });

  const { execute, status } = useServerAction(updateDashboardFlagsAction, {
    onSuccess: ({ data }) => {
      if (data?.dashboard) {
        form.reset({
          home: data.dashboard.home,
          teams: data.dashboard.teams,
          marketplace: data.dashboard.marketplace,
          billing: data.dashboard.billing,
          settings: data.dashboard.settings,
          landing: data.dashboard.homeRoute,
        });
      }
      toast.success("设置已保存");
    },
    onError: (error) => {
      toast.error(error.err?.message ?? "保存失败，请稍后重试");
    },
  });

  const handleSubmit = (values: FormValues) => {
    execute(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex max-w-xl flex-col gap-6">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">显示模块</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            控制仪表盘左侧导航栏展示哪些模块。
          </p>

          <div className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="home"
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
                    <FormLabel className="text-base">仪表盘首页</FormLabel>
                    <FormDescription>显示 /dashboard 主面板。</FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="teams"
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
                    <FormLabel className="text-base">团队</FormLabel>
                    <FormDescription>管理团队、成员和角色。</FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="marketplace"
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
                    <FormLabel className="text-base">组件市场</FormLabel>
                    <FormDescription>展示可购买或领取的组件内容。</FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="billing"
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
                    <FormLabel className="text-base">账单管理</FormLabel>
                    <FormDescription>允许用户查看套餐、发票与支付方式。</FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings"
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
                    <FormLabel className="text-base">账户设置</FormLabel>
                    <FormDescription>开放个人资料、安全等功能菜单。</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">仪表盘默认跳转</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            关闭仪表盘首页时，访问 /dashboard 将重定向到此路径。
          </p>

          <FormField
            control={form.control}
            name="landing"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel>目标路径</FormLabel>
                <FormControl>
                  <Input placeholder="/dashboard/billing" {...field} />
                </FormControl>
                <FormDescription>必须以 / 开头，例如 /dashboard/billing。</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={status === "pending"}>
            {status === "pending" ? "保存中…" : "保存设置"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
