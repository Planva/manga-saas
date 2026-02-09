import { getSessionFromCookie } from "@/utils/auth";
import { isGoogleSSOEnabled } from "@/flags";
import GoogleOneTapPromptClient from "./google-one-tap-prompt.client";

export default async function GoogleOneTapLoginCard() {
  const [session, googleSSOEnabled] = await Promise.all([
    getSessionFromCookie(),
    isGoogleSSOEnabled(),
  ]);
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (session?.user || !googleSSOEnabled || !clientId) {
    return null;
  }

  return <GoogleOneTapPromptClient clientId={clientId} />;
}
