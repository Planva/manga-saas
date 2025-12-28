import { headers } from "next/headers";
import { getSiteUrl } from "@/utils/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const site = getSiteUrl({ headers: headers() });
  const now = new Date();
  return [
    { url: site, lastModified: now },
    { url: `${site}/price`, lastModified: now },
    // 需要的话再加别的路径
  ];
}
