// WHAT: The "Delete club" section at the bottom of Club settings. Owner only.
//   To delete, the owner must type the club's exact name, then confirm.
// WITHOUT IT: A club could only be deleted by hand in the database. With a single
//   click-to-delete button instead, one misclick would wipe out every event and RSVP.
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { deleteClub } from "../lib/clubs";
import { inputClass } from "../lib/formUtils";
import { btnDanger } from "../lib/ui";

export default function DeleteClub({
  clubId,
  clubName,
}: {
  clubId: string;
  clubName: string;
}) {
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const matches = typed.trim() === clubName.trim();

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      await deleteClub(clubId);
      navigate("/me/clubs", { replace: true }); // the club page no longer exists
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't delete the club.",
      );
      setDeleting(false);
    }
  }

  return (
    <section
      aria-labelledby="delete-club-heading"
      className="mt-10 rounded-xl border border-red-200 bg-white p-4"
    >
      <h2 id="delete-club-heading" className="font-semibold text-red-700">
        Delete club
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        This permanently deletes {clubName}, all of its events and everyone's
        RSVPs to them, and removes every exec. It can't be undone. If you're
        handing the club to someone else, transfer ownership instead.
      </p>
      <form
        className="mt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (matches && !deleting) void handleDelete();
        }}
      >
        <label htmlFor="delete-club-confirm" className="block text-sm">
          Type <strong className="font-semibold">{clubName}</strong> to confirm
        </label>
        <input
          id="delete-club-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={!matches || deleting}
          className={btnDanger}
        >
          <Trash2 aria-hidden="true" />
          {deleting ? "Deleting…" : "Delete this club"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
