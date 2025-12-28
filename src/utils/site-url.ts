// src/utils/site-url.ts
/** 返回带协议且合法的站点 URL（优先请求头，其次 NEXT_PUBLIC_SITE_URL），本地回退到 http://localhost:3000 */
type SiteUrlOptions = {
  headers?: Headers;
};

const normalizeHeaderValue = (value?: string | null): string | null => {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
};

const isLocalHost = (host: string): boolean => {
  const hostname = host.split(":")[0]?.trim().toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
};

export function getSiteUrl(options: SiteUrlOptions = {}): string {
  const headerHost =
    normalizeHeaderValue(options.headers?.get("x-forwarded-host")) ||
    normalizeHeaderValue(options.headers?.get("host"));

  if (headerHost) {
    const protoHeader = normalizeHeaderValue(options.headers?.get("x-forwarded-proto"));
    const normalizedProto = protoHeader?.toLowerCase();
    const proto =
      normalizedProto && (normalizedProto === "http" || normalizedProto === "https")
        ? normalizedProto
        : isLocalHost(headerHost)
          ? "http"
          : "https";
    return `${proto}://${headerHost}`;
  }

  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";

  if (!raw) return "http://localhost:3000";
  // 已包含协议直接返回
  if (/^https?:\/\//i.test(raw)) return raw.trim();
  // 只有域名时补 https://
  return `https://${raw.trim()}`;
}
