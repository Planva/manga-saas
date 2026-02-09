import { getSessionFromCookie } from "@/utils/auth";
import { isGoogleSSOEnabled } from "@/flags";
import GoogleOneTapPromptClient from "./google-one-tap-prompt.client";

const normalizeOrigin = (value: string): string | null => {
  const raw = value.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin.toLowerCase();
  } catch {
    return null;
  }
};

const getAllowedOrigins = (): string[] => {
  const raw = process.env.GOOGLE_ONE_TAP_ALLOWED_ORIGINS ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const origins = raw
    .split(",")
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));
  return Array.from(new Set(origins));
};

export default async function GoogleOneTapLoginCard() {
  const [session, googleSSOEnabled] = await Promise.all([
    getSessionFromCookie(),
    isGoogleSSOEnabled(),
  ]);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const allowedOrigins = getAllowedOrigins();

  if (session?.user || !googleSSOEnabled || !clientId) {
    return null;
  }

  return (
    <GoogleOneTapPromptClient
      clientId={clientId}
      allowedOrigins={allowedOrigins}
    />
  );
}
