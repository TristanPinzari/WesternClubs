// WHAT: The one shared rule for silent blocks: if A blocks B, then to B, A looks
//   exactly like a private profile (see the user_block table in schema.ts).
// WITHOUT IT: Every list (search, suggestions, attendee lists, profiles) would need its
//   own copy of the check, and missing it in just one place would let B keep tracking A.
import { and, eq, notExists, sql, type AnyColumn } from "drizzle-orm";
import { db } from "./db";
import { userBlock } from "./db/schema";

// SQL condition for a WHERE clause: true unless `personId` (a column, e.g. user.id) has
// blocked `viewerId`. Use it in every query that lists other students.
export const notBlockedBy = (personId: AnyColumn, viewerId: string) =>
  notExists(
    db
      .select({ one: sql`1` })
      .from(userBlock)
      .where(
        and(
          eq(userBlock.blockerId, personId),
          eq(userBlock.blockedId, viewerId),
        ),
      ),
  );

// True if `blockerId` has blocked `blockedId`.
export async function hasBlocked(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ blockerId: userBlock.blockerId })
    .from(userBlock)
    .where(
      and(
        eq(userBlock.blockerId, blockerId),
        eq(userBlock.blockedId, blockedId),
      ),
    );
  return !!row;
}
