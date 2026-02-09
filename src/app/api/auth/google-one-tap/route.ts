import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ZSAError } from "zsa";

import { getDB } from "@/db";
import { userTable } from "@/db/schema";
import { createAndStoreSession, canSignUp } from "@/utils/auth";
import { isGoogleSSOEnabled } from "@/flags";
import { getIP } from "@/utils/get-IP";
import { RATE_LIMITS, withRateLimit } from "@/utils/with-rate-limit";

type GoogleTokenInfoResponse = {
  iss?: string;
  aud?: string;
  azp?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  exp?: string;
};

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function normalizeEpoch(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function isValidGoogleIssuer(value: string | undefined): boolean {
  if (!value) return false;
  return value === "https://accounts.google.com" || value === "accounts.google.com";
}

function badRequest(message: string) {
  return NextResponse.json({ success: false, message }, { status: 400 });
}

function unauthorized(message: string) {
  return NextResponse.json({ success: false, message }, { status: 401 });
}

export async function POST(request: Request) {
  return withRateLimit(async () => {
    if (!(await isGoogleSSOEnabled())) {
      return NextResponse.json(
        { success: false, message: "Google SSO is not enabled" },
        { status: 403 },
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { success: false, message: "Google client ID is missing" },
        { status: 500 },
      );
    }

    let payload: { credential?: string };
    try {
      payload = (await request.json()) as { credential?: string };
    } catch {
      return badRequest("Invalid JSON body");
    }

    const credential = payload.credential?.trim();
    if (!credential) {
      return badRequest("Missing credential");
    }

    let tokenInfo: GoogleTokenInfoResponse;
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        return unauthorized("Invalid Google credential");
      }
      tokenInfo = (await response.json()) as GoogleTokenInfoResponse;
    } catch (error) {
      console.error("[google-one-tap] token verification request failed", error);
      return NextResponse.json(
        { success: false, message: "Failed to verify Google credential" },
        { status: 502 },
      );
    }

    if (!isValidGoogleIssuer(tokenInfo.iss)) {
      return unauthorized("Invalid token issuer");
    }
    if (tokenInfo.aud !== clientId) {
      return unauthorized("Invalid token audience");
    }

    const exp = normalizeEpoch(tokenInfo.exp);
    if (!exp || exp <= Math.floor(Date.now() / 1000)) {
      return unauthorized("Google credential has expired");
    }

    const googleAccountId = tokenInfo.sub?.trim();
    const email = tokenInfo.email?.trim().toLowerCase();
    const emailVerified = normalizeBoolean(tokenInfo.email_verified);

    if (!googleAccountId || !email) {
      return unauthorized("Google credential payload is incomplete");
    }

    await canSignUp({ email });

    const db = getDB();

    try {
      const existingUserWithGoogle = await db.query.userTable.findFirst({
        where: eq(userTable.googleAccountId, googleAccountId),
      });

      if (existingUserWithGoogle?.id) {
        await createAndStoreSession(existingUserWithGoogle.id, "google-oauth");
        return NextResponse.json({ success: true });
      }

      const existingUserWithEmail = await db.query.userTable.findFirst({
        where: eq(userTable.email, email),
      });

      if (existingUserWithEmail?.id) {
        const [updatedUser] = await db
          .update(userTable)
          .set({
            googleAccountId,
            avatar: existingUserWithEmail.avatar || tokenInfo.picture || null,
            emailVerified: existingUserWithEmail.emailVerified || (emailVerified ? new Date() : null),
          })
          .where(eq(userTable.id, existingUserWithEmail.id))
          .returning();

        await createAndStoreSession(updatedUser.id, "google-oauth");
        return NextResponse.json({ success: true });
      }

      const [newUser] = await db
        .insert(userTable)
        .values({
          googleAccountId,
          firstName: tokenInfo.given_name || tokenInfo.name || null,
          lastName: tokenInfo.family_name || null,
          avatar: tokenInfo.picture || null,
          email,
          emailVerified: emailVerified ? new Date() : null,
          signUpIpAddress: await getIP(),
        })
        .returning();

      await createAndStoreSession(newUser.id, "google-oauth");
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("[google-one-tap] failed to sign in", error);

      if (error instanceof ZSAError) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { success: false, message: "An unexpected error occurred" },
        { status: 500 },
      );
    }
  }, RATE_LIMITS.GOOGLE_SSO_CALLBACK);
}
