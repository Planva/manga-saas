import { headers } from "next/headers";
import { getSiteUrl } from "@/utils/site-url";

export const dynamic = "force-dynamic";

export default function robots() {
  const site = getSiteUrl({ headers: headers() });
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
