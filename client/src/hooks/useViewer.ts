// WHAT: Use the real Better Auth session, or a clearly labelled development-only actor.
// WITHOUT IT: Exec pages could display controls before the user's session is known.
import { authClient } from "../lib/auth-client";
import { useMockExec } from "../lib/demoMode";

function useLiveViewer() {
  const { data, isPending, error } = authClient.useSession();
  return {
    user: data?.user ?? null,
    pending: isPending,
    error: error?.message ?? null,
  };
}
function useDemoViewer() {
  return {
    user: { id: "demo-owner", name: "Demo club executive" },
    pending: false,
    error: null,
  };
}
// The build-time flag never changes during a component's lifetime.
export const useViewer = useMockExec ? useDemoViewer : useLiveViewer;
