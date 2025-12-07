// src/app/(auth)/sign-in/sign-in.client.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";

import { signInAction } from "./sign-in.actions";
import { type SignInSchema, signInSchema } from "@/schemas/signin.schema";

import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SeparatorWithText from "@/components/separator-with-text";

import SSOButtons from "../_components/sso-buttons";


type Props = { redirectPath: string };

export default function SignInClient({ redirectPath }: Props) {
  const router = useRouter();
  const form = useForm<SignInSchema>({ resolver: zodResolver(signInSchema) });

  const { execute: signIn, isPending } = useServerAction(signInAction, {
    onError: (error) => {
      toast.error(error.err?.message || "Invalid email or password");
    },
    onSuccess: () => {
      router.replace(redirectPath);
      router.refresh();
    },
  });

  const onSubmit = async (values: SignInSchema) => {
    await signIn(values);
  };

  return (
    <div className="min-h-[90vh] flex flex-col items-center px-4 justify-center bg-background my-6 md:my-10">
      <div className="w-full max-w-md space-y-8 p-6 md:p-10 bg-card rounded-xl shadow-sm border">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <div className="mt-6">
            {/* 登录页用 isSignIn，文案会是 “Sign in with Google” */}
            <SSOButtons isSignIn />
          </div>
        </div>

        <SeparatorWithText text="Email" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="username"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="Password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending} aria-busy={isPending}>
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>

        {/* 辅助链接区 */}
        <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
          <p>
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              Forgot your password?
            </Link>
          </p>
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
