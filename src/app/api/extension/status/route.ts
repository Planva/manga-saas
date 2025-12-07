import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/utils/auth";
import { getSystemSettings } from "@/utils/system-settings";
import { hasUnlimitedAccess } from "@/utils/credits";

export const dynamic = "force-dynamic";

const buildCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin");

  const headers = new Headers();
  headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  );
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");

  // Always echo the requesting origin if present (extensions need explicit origin, not *)
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  } else {
    headers.set("Access-Control-Allow-Origin", "*");
  }

  headers.set("Access-Control-Allow-Headers", "Content-Type, Cookie, Authorization");
  headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");

  return headers;
};

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 204, headers: buildCorsHeaders(req) });
}

export async function GET(req: Request) {
  try {
    const headers = buildCorsHeaders(req);

    const settings = await getSystemSettings();
    const session = await getSessionFromCookie();
    const usageMode = (process.env.FEATURE_USAGE_MODE ?? "credits") as "credits" | "free";
    const perUseCost = Math.max(0, Number(settings.perUseCreditCost ?? 1)) || 1;

    let unlimited = false;

    if (session?.user?.id) {
      unlimited = await hasUnlimitedAccess(String(session.user.id));
    }

    return NextResponse.json(
      {
        loggedIn: Boolean(session?.user?.id),
        user: session?.user
          ? {
              id: session.user.id,
              email: session.user.email,
              firstName: session.user.firstName,
              lastName: session.user.lastName,
              avatar: session.user.avatar ?? null,
              currentCredits: session.user.currentCredits ?? null,
            }
          : null,
        unlimited,
        usageMode,
        perUseCost,
        guestDailyFreeEnabled: settings.guestDailyFreeEnabled,
        loginUrl: "/sign-in?next=/",
      },
      { headers },
    );
  } catch (error) {
    const headers = buildCorsHeaders(req);
    return NextResponse.json(
      { error: "failed_to_load_status", message: (error as Error)?.message ?? "Unknown error" },
      { status: 500, headers },
    );
  }
}
