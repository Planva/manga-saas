"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { updateMobileNavToggleAction } from "../_actions/update-mobile-nav-toggle.action";

const schema = z.object({
    enabled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
    initialEnabled: boolean;
};

export function MobileNavToggleForm({ initialEnabled }: Props) {
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { enabled: initialEnabled },
    });

    const { execute, status } = useServerAction(updateMobileNavToggleAction, {
        onSuccess: ({ data }) => {
            if (data?.settings) {
                form.reset({ enabled: data.settings.mobileBottomNavEnabled });
            }
            toast.success("Mobile Bottom Navigation settings updated");
        },
        onError: (error) => {
            toast.error(error.err?.message ?? "Failed to update settings");
        },
    });

    const onSubmit = (values: FormValues) => {
        execute(values);
    };

    return (
        <div className="flex max-w-2xl flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div>
                <h2 className="text-xl font-semibold">Mobile Bottom Navigation</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Show a fixed bottom navigation bar on mobile devices.
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
                                        <FormLabel className="text-base">Enable Mobile Bottom Nav</FormLabel>
                                        <FormDescription>
                                            When enabled, the bottom navigation bar will be visible on mobile screens.
                                        </FormDescription>
                                    </div>
                                </div>
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-end gap-3">
                        <Button type="submit" disabled={status === "pending"}>
                            {status === "pending" ? "Saving..." : "Save changes"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
