"use client";

import { useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { updateBannerSettingsAction } from "../_actions/update-banner-settings.action";

const MAX_MESSAGES = 20;

const formSchema = z.object({
  isEnabled: z.boolean(),
  messagesText: z
    .string()
    .max(4000, "Messages are too long."),
  itemsPerCycle: z
    .coerce
    .number()
    .int()
    .min(1, "Show at least one announcement per loop.")
    .max(MAX_MESSAGES, `Show at most ${MAX_MESSAGES} announcements per loop.`),
  bannerHeight: z
    .coerce
    .number()
    .int()
    .min(24, "Minimum height is 24px.")
    .max(120, "Maximum height is 120px."),
});

type FormValues = z.infer<typeof formSchema>;

const toTextareaValue = (messages: string[]): string =>
  messages.join("\n");

const mapMessagesFromTextarea = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

type BannerSettingsFormProps = {
  initialSettings: {
    isEnabled: boolean;
    messages: string[];
    itemsPerCycle: number;
    bannerHeight: number;
  };
};

export function BannerSettingsForm({ initialSettings }: BannerSettingsFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isEnabled: initialSettings.isEnabled,
      messagesText: toTextareaValue(initialSettings.messages),
      itemsPerCycle: initialSettings.itemsPerCycle,
      bannerHeight: initialSettings.bannerHeight,
    },
  });

  const messagesText = form.watch("messagesText");

  const currentMessageCount = useMemo(
    () => mapMessagesFromTextarea(messagesText).length,
    [messagesText]
  );

  const { execute: saveSettings, status } = useServerAction(updateBannerSettingsAction, {
    onSuccess: ({ data }) => {
      if (data?.settings) {
        form.reset({
          isEnabled: data.settings.isEnabled,
          messagesText: toTextareaValue(data.settings.messages),
          itemsPerCycle: data.settings.itemsPerCycle,
          bannerHeight: data.settings.bannerHeight,
        });
      }
      toast.success("Banner settings saved.");
    },
    onError: (error) => {
      toast.error(error.err?.message ?? "Failed to save banner settings.");
    },
  });

  const onSubmit = (values: FormValues) => {
    const messages = mapMessagesFromTextarea(values.messagesText);

    saveSettings({
      isEnabled: values.isEnabled,
      messages,
      itemsPerCycle: values.itemsPerCycle,
      bannerHeight: values.bannerHeight,
    });
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">设置</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          管理公告横幅、轮播内容与高度。
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="isEnabled"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-start gap-4 rounded-lg border border-border bg-background p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      ref={field.ref}
                      className="mt-1 h-5 w-5 cursor-pointer accent-primary"
                      aria-label="Enable announcement banner"
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="text-base">
                      Enable banner
                    </FormLabel>
                    <FormDescription>
                      Toggle the marquee banner on or off. When enabled, at least one announcement is required.
                    </FormDescription>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="messagesText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Announcement messages</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter one announcement per line"
                    {...field}
                    className="min-h-[140px]"
                  />
                </FormControl>
                <FormDescription>
                  {`Current announcements: ${currentMessageCount}. You can add up to ${MAX_MESSAGES}.`}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="itemsPerCycle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Announcements per loop</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={MAX_MESSAGES}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Number of announcements to show before the ticker repeats. Extra messages will rotate in subsequent loops.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bannerHeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Banner height (px)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={24}
                    max={120}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Adjust the vertical height of the ticker bar. Recommended range is 24&nbsp;-&nbsp;120 pixels.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              disabled={status === "pending"}
            >
              {status === "pending" ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
