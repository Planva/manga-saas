import "server-only";

import { getDB } from "@/db";
import { adminUserEventTable } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";

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
