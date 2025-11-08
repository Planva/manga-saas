import type { Metadata } from "next";

import { getUserEventSummary } from "@/utils/user-events";

export const metadata: Metadata = {
  title: "User Behavior",
  description: "查看关键操作的统计。",
};

export default async function UserAnalyticsPage() {
  const { totals, recent } = await getUserEventSummary();

  const safeParse = (value: string | null | undefined) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const renderDataCell = (data: unknown) => {
    if (
      data === null ||
      data === undefined ||
      (typeof data === "string" && data.trim().length === 0)
    ) {
      return "暂无";
    }

    const printable =
      typeof data === "string" ? data : JSON.stringify(data);

    return (
      <code className="block rounded bg-muted px-2 py-1 text-xs whitespace-pre-wrap break-words">
        {printable}
      </code>
    );
  };

  const recentWithParsed = recent.map((event) => ({
    ...event,
    metadataParsed: safeParse(event.metadata),
    contextParsed: safeParse((event as { context?: string | null }).context),
  }));

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">用户行为</h1>
        <p className="text-sm text-muted-foreground">
          统计测试按钮、支付按钮等关键操作的触发次数，帮助你了解用户行为。
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">事件汇总</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {totals.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">
              暂无数据，等待用户产生交互。
            </p>
          ) : (
            totals.map((item) => (
              <div
                key={item.eventType}
                className="rounded-lg border border-border bg-background p-4"
              >
                <p className="text-sm text-muted-foreground">事件类型</p>
                <p className="text-lg font-semibold">{item.eventType}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  总计：{item.count}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">最新记录</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">时间</th>
                <th className="py-2 pr-4">事件类型</th>
                <th className="py-2 pr-4">用户 ID</th>
                <th className="py-2 pr-4">邮箱</th>
                <th className="py-2 pr-4">备注</th>
                <th className="py-2 pr-4">上下文</th>
              </tr>
            </thead>
            <tbody>
              {recentWithParsed.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-muted-foreground"
                  >
                    暂无记录
                  </td>
                </tr>
              ) : (
                recentWithParsed.map((event) => (
                  <tr key={event.id} className="border-t border-border/60">
                    <td className="py-2 pr-4">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 font-medium">{event.eventType}</td>
                    <td className="py-2 pr-4">{event.userId ?? "—"}</td>
                    <td className="py-2 pr-4">{event.email ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {renderDataCell(event.metadataParsed)}
                    </td>
                    <td className="py-2 pr-4">
                      {renderDataCell(event.contextParsed)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
