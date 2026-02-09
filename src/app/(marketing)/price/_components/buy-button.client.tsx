// src/app/(marketing)/price/_components/buy-button.client.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { createCheckoutSessionUrl } from "../server-actions";
import { toast } from "sonner";

export default function BuyButton({
  kind,
  priceId,
  label,
  className,
}: {
  kind: "pack" | "subscription";
  priceId: string;
  label: string;
  className?: string;
}) {
  const [loading, setLoading] = React.useState(false);

  return (
    <Button
      type="button"
      className={className}
      disabled={loading}
      aria-busy={loading}
      onClick={async () => {
        try {
          setLoading(true);
          const result = await createCheckoutSessionUrl({ kind, priceId });
          if ("errorMessage" in result) {
            toast.error(result.errorMessage);
            console.error("[checkout] initialization failed", {
              kind,
              priceId,
              message: result.errorMessage,
            });
            return;
          }

          if (result.url) window.location.href = result.url;
          else toast.error("Failed to start checkout.");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Redirecting…" : label}
    </Button>
  );
}
