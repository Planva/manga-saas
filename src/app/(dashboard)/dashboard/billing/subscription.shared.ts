// src/app/(dashboard)/dashboard/billing/subscription.shared.ts
import type { UiSubscription } from "./subscription.server";

/** 小工具：格式化日期（本地时区） */
export function formatUntil(d?: Date) {
  if (!d) return "-";
  try {
    return d.toLocaleString();
  } catch {
    return String(d);
  }
}

/** 把订阅状态转成一行文案 —— 带空值兜底 */
export function renderStatusLine(s?: UiSubscription) {
  if (!s) return "当前订阅：无";
  if (s.code === "none") return "当前订阅：无";
  if (s.code === "monthly") return "当前订阅：月度订阅";
  if (s.code === "yearly") return "当前订阅：年度订阅";
  // canceled
  return `当前订阅：已取消（可使用至 ${formatUntil(s.until)}）`;
}

/** 返回一个简短 Badge 文案（可选） */
export function renderBadgeText(s?: UiSubscription) {
  if (!s || s.code === "none") return "未订阅";
  if (s.code === "monthly") return "月度订阅";
  if (s.code === "yearly") return "年度订阅";
  return "已取消";
}
