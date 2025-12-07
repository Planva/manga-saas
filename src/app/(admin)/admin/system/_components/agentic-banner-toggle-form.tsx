"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { updateAgenticBannerToggleAction } from "../_actions/update-agentic-banner-toggle.action";

const schema = z.object({
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  initialEnabled: boolean;
};

export function AgenticBannerToggleForm({ initialEnabled }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { enabled: initialEnabled },
  });

  const { execute, status } = useServerAction(updateAgenticBannerToggleAction, {
    onSuccess: ({ data }) => {
      if (data?.settings) {
        form.reset({ enabled: data.settings.agenticBannerEnabled });
      }
      toast.success("弹窗开关已更新");
    },
    onError: (error) => {
      toast.error(error.err?.message ?? "更新失败，请稍后再试");
    },
  });

  const onSubmit = (values: FormValues) => {
    execute(values);
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">弹窗开关</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          控制是否在前台显示右下角 AgenticDev 介绍弹窗。关闭后仅隐藏展示，不影响其他功能。
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      ref={field.ref}
                      className="mt-1 h-5 w-5 cursor-pointer accent-primary"
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="text-base">显示右下角弹窗</FormLabel>
                    <FormDescription>
                      关闭后弹窗完全隐藏，页面不再占位。
                    </FormDescription>
                  </div>
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3">
            <Button type="submit" disabled={status === "pending"}>
              {status === "pending" ? "保存中…" : "保存更改"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
