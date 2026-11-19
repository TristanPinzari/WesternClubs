// WHAT: Owner/admin settings, preserving the club slug when its name changes.
// WITHOUT IT: Execs could not update club details or hand leadership to the next team.
import { useCallback } from "react";
import { Link, useParams } from "react-router";
import ClubForm from "../components/ClubForm";
import ExecMembers from "../components/ExecMembers";
import RequestState from "../components/RequestState";
import { useClubAccess } from "../hooks/useClubAccess";
import { useResource } from "../hooks/useResource";
import { getClub, updateClub } from "../lib/clubs";
import { canManageClub } from "../lib/execTypes";
export default function ClubSettingsPage() {
  const { slug = "" } = useParams();
  return <ClubSettings key={slug} slug={slug} />;
}
function ClubSettings({ slug }: { slug: string }) {
  const state = useResource(useCallback(() => getClub(slug), [slug]));
  const access = useClubAccess(state.data?.id);
  return (
    <section>
      <Link
        to={`/clubs/${slug}`}
        className="inline-flex min-h-11 items-center text-violet-700 underline"
      >
        ← Club page
      </Link>
      <h1 className="text-2xl font-bold">Club settings</h1>
      <RequestState {...state} />
      <RequestState
        loading={access.loading}
        error={access.viewer.error || access.error}
        retry={access.retry}
      />
      {!access.loading && state.data && !canManageClub(access.role) && (
        <p className="mt-4">
          Only this club's owner and admins can change settings.
        </p>
      )}
      {!access.loading && state.data && canManageClub(access.role) && (
        <>
          <p className="mt-3 text-sm text-gray-600">
            Renaming the club does not change its URL: /clubs/{slug}
          </p>
          <ClubForm
            key={state.data.id}
            initial={state.data}
            onSave={async (input) => {
              await updateClub(state.data!.id, input);
              state.retry();
            }}
          />
          {/* Not keyed by role: a transfer changes the role, and remounting would lose
              the "Ownership transferred" message. Permissions come from the `role` prop. */}
          <ExecMembers
            key={`execs:${state.data.id}`}
            clubId={state.data.id}
            clubName={state.data.name}
            role={access.role!}
            actorId={access.viewer.user!.id}
            onRoleChange={access.retry}
          />
        </>
      )}
    </section>
  );
}
