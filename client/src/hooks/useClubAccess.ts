// WHAT: Find the signed-in user's role from GET /me/clubs, without inventing permissions.
// WITHOUT IT: Public pages might assume a role or fail completely while auth is loading.
import { useCallback } from "react";
import { getMyClubs } from "../lib/clubs";
import { useResource } from "./useResource";
import { useViewer } from "./useViewer";

export function useClubAccess(clubId?: string) {
  const viewer = useViewer();
  const userId = viewer.user?.id;
  const resource = useResource(
    useCallback(
      () => (userId && clubId ? getMyClubs() : Promise.resolve([])),
      [userId, clubId],
    ),
  );
  return {
    ...resource,
    viewer,
    loading: viewer.pending || resource.loading,
    role: resource.data?.find((club) => club.id === clubId)?.role,
  };
}
