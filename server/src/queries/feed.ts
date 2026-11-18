// WHAT: One parameterized SQL query for the feed signals available on merged main.
// WITHOUT IT: The frontend would need every event to rank/paginate consistently.
// Score 2 (followed person's public RSVP) waits for Rokyo's merged RSVP table.
// Never inspect anonymous RSVPs or guess a table from an unmerged branch.
import { sql } from "drizzle-orm";

export function feedQuery(
  userId: string,
  limit: number,
  offset: number,
  mediaBaseUrl: string,
) {
  return sql`
    WITH ranked AS (
      SELECT e.*, c.name AS club_name, c.slug AS club_slug,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM club_follow f
            WHERE f.user_id = ${userId} AND f.club_id = e.club_id
          ) THEN 3
          WHEN EXISTS (
            SELECT 1 FROM profile p
            WHERE p.user_id = ${userId} AND e.category = ANY(p.interests)
          ) THEN 1
          ELSE 0
        END AS score
      FROM event e JOIN club c ON c.id = e.club_id
      WHERE e.starts_at >= now() AND e.cancelled_at IS NULL
    )
    SELECT (SELECT count(*)::integer FROM ranked) AS total,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', id, 'title', title, 'description', description,
          'category', category, 'startsAt', starts_at, 'endsAt', ends_at,
          'location', location, 'priceCents', price_cents,
          'imageUrl', CASE WHEN image_key IS NULL THEN NULL ELSE ${mediaBaseUrl} || image_key END,
          'club', jsonb_build_object('id', club_id, 'name', club_name, 'slug', club_slug),
          'reason', CASE score WHEN 3 THEN 'followed_club' WHEN 1 THEN 'interest' ELSE NULL END
        ) ORDER BY score DESC, starts_at, id)
        FROM (SELECT * FROM ranked ORDER BY score DESC, starts_at, id LIMIT ${limit} OFFSET ${offset}) page
      ), '[]'::jsonb) AS items
  `;
}
