// WHAT: Signed-in club creation with redirect to the slug returned by the server.
// WITHOUT IT: Execs would need a database tool to start a club.
import { ArrowLeft } from "lucide-react";
import { backLink, textLink } from "../lib/ui";
import { Link, useNavigate } from "react-router";
import ClubForm from "../components/ClubForm";
import RequestState from "../components/RequestState";
import { useViewer } from "../hooks/useViewer";
import { createClub } from "../lib/clubs";
export default function CreateClubPage() {
  const viewer = useViewer();
  const navigate = useNavigate();
  return (
    <section>
      <Link to="/clubs" className={backLink}>
        <ArrowLeft aria-hidden="true" />
        Clubs
      </Link>
      <h1 className="text-2xl font-bold">Create a club</h1>
      <RequestState loading={viewer.pending} error={viewer.error} />
      {!viewer.pending && !viewer.user && (
        <p className="mt-4">
          <Link to="/sign-in" className={textLink}>
            Sign in
          </Link>{" "}
          to create a club.
        </p>
      )}
      {viewer.user && (
        <ClubForm
          key={viewer.user.id}
          onSave={async (input) => {
            const { club, warning } = await createClub(input);
            navigate(`/clubs/${club.slug}`, { state: { warning } });
          }}
        />
      )}
    </section>
  );
}
