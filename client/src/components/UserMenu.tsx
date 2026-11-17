// WHAT: The right side of the header: the signed-in user's name and a sign-out button,
//   or Sign in / Sign up links when nobody is signed in.
// WITHOUT IT: There'd be no way to reach the auth pages from the nav, and no sign that
//   you're signed in (or as whom).
import { Link, useNavigate } from "react-router";
import { authClient } from "../lib/auth-client";

export default function UserMenu() {
  const navigate = useNavigate();
  // useSession() asks the server who's signed in (GET /api/auth/get-session) and
  // re-renders this component whenever you sign in or out, on any page.
  const { data: session, isPending } = authClient.useSession();

  // While the first check is in flight, render nothing rather than flashing "Sign in".
  if (isPending) return null;

  if (!session) {
    return (
      <div className="ml-auto flex items-center gap-3 text-sm">
        <Link to="/sign-in" className="text-gray-600">
          Sign in
        </Link>
        <Link
          to="/sign-up"
          className="rounded-lg bg-violet-700 px-3 py-1.5 font-semibold text-white"
        >
          Sign up
        </Link>
      </div>
    );
  }

  async function handleSignOut() {
    await authClient.signOut(); // clears the session cookie on the server
    navigate("/");
  }

  return (
    <div className="ml-auto flex min-w-0 items-center gap-3 text-sm">
      {/* TODO(Rokyo): show the profile picture (session.user.image) once uploads exist. */}
      <span className="truncate font-medium">{session.user.name}</span>
      <button
        type="button"
        onClick={handleSignOut}
        className="shrink-0 text-gray-600 underline"
      >
        Sign out
      </button>
    </div>
  );
}
