import type { Metadata } from "next";

import { getUserEventSummary, getUserEventTimelines } from "@/utils/user-events";

export const metadata: Metadata = {
  title: "User Behavior",
  description: "查看关键操作的统计。",
};

export default async function UserAnalyticsPage() {
  const [{ totals }, { timelines }] = await Promise.all([
    getUserEventSummary(),
    getUserEventTimelines({ limit: 500 }),
  ]);

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

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleString();

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">用户行为</h1>
        <p className="text-sm text-muted-foreground">
          聚合用户完整访问轨迹，方便排查问题与定位错误。游客访问会标记为“游客”。
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
        <h2 className="text-lg font-semibold">用户访问轨迹</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          每位用户/游客一条记录，展开可查看从进入到离开的所有事件；错误事件会标红。
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {timelines.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无记录</p>
          ) : (
            timelines.map((user) => (
              <details
                key={user.key}
                className="rounded-lg border border-border bg-background p-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {user.label}
                      </span>
                      {user.key !== "guest" && user.key !== user.label && (
                        <span className="text-xs text-muted-foreground">ID: {user.key}</span>
                      )}
                    </div>
                    {user.isGuest && (
                      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        游客
                      </span>
                    )}
                    {user.errorCount > 0 && (
                      <span className="rounded-full bg-destructive/20 px-2 py-1 text-xs text-destructive">
                        错误 {user.errorCount}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>事件数：{user.events.length}</span>
                    <span>进入：{formatTime(user.firstSeen)}</span>
                    <span>最后：{formatTime(user.lastSeen)}</span>
                  </div>
                </summary>

                <div className="mt-4 space-y-3">
                  {user.events.map((event) => (
                    <div
                      key={event.id}
                      className={`rounded-md border px-3 py-2 text-sm ${
                        event.isError
                          ? "border-destructive/60 bg-destructive/10"
                          : "border-border bg-card/60"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{event.eventType}</span>
                        {event.isError && (
                          <span className="rounded-full bg-destructive/80 px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground">
                            错误
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTime(event.createdAt)}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">备注 / metadata</p>
                          {renderDataCell(event.metadata)}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">上下文 / context</p>
                          {renderDataCell(event.context)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
