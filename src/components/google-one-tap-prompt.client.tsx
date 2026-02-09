"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Script from "next/script";

type Props = {
  clientId: string;
};

type GoogleCredentialResponse = {
  credential: string;
  select_by?: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    context?: "signin" | "signup" | "use";
    cancel_on_tap_outside?: boolean;
    auto_select?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  prompt: (momentListener?: (notification: unknown) => void) => void;
  cancel: () => void;
};

type GoogleGlobal = {
  accounts: {
    id: GoogleAccountsId;
  };
};

declare global {
  interface Window {
    google?: GoogleGlobal;
  }
}

export default function GoogleOneTapPromptClient({ clientId }: Props) {
  const router = useRouter();
  const initializedRef = React.useRef(false);
  const submittingRef = React.useRef(false);

  const handleCredential = React.useCallback(
    async (response: GoogleCredentialResponse) => {
      const credential = response?.credential?.trim();
      if (!credential || submittingRef.current) return;

      submittingRef.current = true;
      try {
        const res = await fetch("/api/auth/google-one-tap", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential }),
        });

        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; message?: string }
          | null;

        if (!res.ok || !data?.success) {
          const msg = data?.message || "Google One Tap sign in failed";
          toast.error(msg);
          return;
        }

        toast.success("Signed in with Google");
        router.refresh();
        window.location.reload();
      } catch (error) {
        console.error("[google-one-tap] sign in request failed", error);
        toast.error("Google One Tap sign in failed");
      } finally {
        submittingRef.current = false;
      }
    },
    [router],
  );

  const initOneTap = React.useCallback(() => {
    if (initializedRef.current) return;

    const googleId = window.google?.accounts?.id;
    if (!googleId) return;

    googleId.initialize({
      client_id: clientId,
      callback: handleCredential,
      context: "signin",
      cancel_on_tap_outside: false,
      auto_select: false,
      use_fedcm_for_prompt: true,
    });
    googleId.prompt();
    initializedRef.current = true;
  }, [clientId, handleCredential]);

  React.useEffect(() => {
    initOneTap();
    return () => {
      window.google?.accounts?.id?.cancel?.();
    };
  }, [initOneTap]);

  return (
    <Script
      id="google-gsi-client"
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={initOneTap}
    />
  );
}
