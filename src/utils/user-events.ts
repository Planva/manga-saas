import "server-only";

import { getDB } from "@/db";
import { adminUserEventTable } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { and, gte } from "drizzle-orm";

type LogUserEventInput = {
  eventType: string;
  userId?: string | null;
  email?: string | null;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

export async function logUserEvent({
  eventType,
  userId,
  email,
  metadata,
  context,
}: LogUserEventInput): Promise<void> {
  const db = getDB();
  const now = Date.now();

  await db.insert(adminUserEventTable).values({
    id: `uevt_${createId()}`,
    eventType,
    userId: userId ?? null,
    email: email ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    context: context ? JSON.stringify(context) : null,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });
}

export async function getUserEventSummary(limit = 20) {
  const db = getDB();

  const totalsRaw = await db
    .select({
      eventType: adminUserEventTable.eventType,
      count: sql<number>`count(${adminUserEventTable.id})`.as("count"),
    })
    .from(adminUserEventTable)
    .groupBy(adminUserEventTable.eventType)
    .orderBy(adminUserEventTable.eventType);

  const totals = totalsRaw.map((row) => ({
    eventType: row.eventType,
    count: Number((row as { count?: unknown }).count ?? 0),
  }));

  const recent = await db
    .select({
      id: adminUserEventTable.id,
      createdAt: adminUserEventTable.createdAt,
      eventType: adminUserEventTable.eventType,
      userId: adminUserEventTable.userId,
      email: adminUserEventTable.email,
      metadata: adminUserEventTable.metadata,
      context: adminUserEventTable.context,
    })
    .from(adminUserEventTable)
    .orderBy(sql`${adminUserEventTable.createdAt} DESC`)
    .limit(limit);

  return { totals, recent };
}

type ParsedEvent = {
  id: string;
  createdAt: number;
  eventType: string;
  userId: string | null;
  email: string | null;
  metadata: unknown;
  context: unknown;
  isError: boolean;
};

const safeParse = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const hasErrorFlag = (value: unknown) => {
  if (!value) return false;
  const asString =
    typeof value === "string"
      ? value
      : (() => {
          try {
            return JSON.stringify(value);
          } catch {
            return "";
          }
        })();
  const lower = asString.toLowerCase();
  return (
    lower.includes("error") ||
    lower.includes("exception") ||
    lower.includes("fail")
  );
};

const isErrorEvent = (eventType: string, metadata: unknown, context: unknown) => {
  const lowerType = eventType.toLowerCase();
  if (lowerType.includes("error") || lowerType.includes("fail")) return true;
  return hasErrorFlag(metadata) || hasErrorFlag(context);
};

export async function getUserEventTimelines({
  limit = 500,
  since,
}: {
  limit?: number;
  since?: Date;
} = {}) {
  const db = getDB();
  const where = since ? and(gte(adminUserEventTable.createdAt, since)) : undefined;

  const events = await db
    .select({
      id: adminUserEventTable.id,
      createdAt: adminUserEventTable.createdAt,
      eventType: adminUserEventTable.eventType,
      userId: adminUserEventTable.userId,
      email: adminUserEventTable.email,
      metadata: adminUserEventTable.metadata,
      context: adminUserEventTable.context,
    })
    .from(adminUserEventTable)
    .where(where)
    .orderBy(sql`${adminUserEventTable.createdAt} DESC`)
    .limit(limit);

  const parsed: ParsedEvent[] = events.map((event) => {
    const metadata = safeParse(event.metadata);
    const context = safeParse((event as { context?: string | null }).context);
    return {
      id: event.id,
      createdAt: new Date(event.createdAt).getTime(),
      eventType: event.eventType,
      userId: event.userId,
      email: event.email,
      metadata,
      context,
      isError: isErrorEvent(event.eventType, metadata, context),
    };
  });

  type Timeline = {
    key: string;
    label: string;
    isGuest: boolean;
    events: ParsedEvent[];
    firstSeen: number;
    lastSeen: number;
    errorCount: number;
  };

  const grouped = new Map<string, Timeline>();

  parsed.forEach((event) => {
    const key = event.userId ?? event.email ?? "guest";
    const existing = grouped.get(key);
    const label =
      event.email ||
      (event.userId ? `用户 ${event.userId}` : "游客");

    if (!existing) {
      grouped.set(key, {
        key,
        label,
        isGuest: !event.userId,
        events: [event],
        firstSeen: event.createdAt,
        lastSeen: event.createdAt,
        errorCount: event.isError ? 1 : 0,
      });
      return;
    }

    existing.events.push(event);
    existing.firstSeen = Math.min(existing.firstSeen, event.createdAt);
    existing.lastSeen = Math.max(existing.lastSeen, event.createdAt);
    if (event.isError) existing.errorCount += 1;
  });

  const timelines = Array.from(grouped.values()).map((timeline) => {
    timeline.events.sort((a, b) => a.createdAt - b.createdAt);
    return timeline;
  });

  timelines.sort((a, b) => b.lastSeen - a.lastSeen);

  return { timelines };
}
