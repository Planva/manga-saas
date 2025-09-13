// src/utils/site-url.ts
export function getSiteUrl(): string {
    const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  }
  