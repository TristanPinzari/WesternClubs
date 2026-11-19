// WHAT: The right side of the header: the signed-in user's name and a sign-out button,
//   or Sign in / Sign up links when nobody is signed in.
// WITHOUT IT: There'd be no way to reach the auth pages from the nav, and no sign that
//   you're signed in (or as whom).
import { LogOut } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router";
import { authClient } from "../lib/auth-client";
import Avatar from "./Avatar";

export default function UserMenu() {
  const navigate = useNavigate();
  // useSession() asks the server who's signed in (GET /api/auth/get-session) and
  // re-renders this component whenever you sign in or out, on any page.
  const { data: session, isPending } = authClient.useSession();

  // While the first check is in flight, render nothing rather than flashing "Sign in".
  if (isPending) return null;

  if (!session) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link
          to="/sign-in"
          className="flex min-h-11 items-center whitespace-nowrap rounded-lg px-2.5 font-medium text-gray-700 hover:bg-gray-100"
        >
          Sign in
        </Link>
        <Link
          to="/sign-up"
          className="flex min-h-11 items-center whitespace-nowrap rounded-lg bg-violet-700 px-3 font-semibold text-white hover:bg-violet-800"
        >
          Sign up
        </Link>
      </div>
    );
  }

  async function handleSignOut() {
    try {
      const { error } = await authClient.signOut(); // clears the session cookie on the server
      if (!error) {
        navigate("/");
        return;
      }
    } catch {
      // Network failure: fall through to the message below.
    }
    // Don't pretend it worked: the session cookie may still be valid.
    window.alert("Couldn't sign out. Check your connection and try again.");
  }

  return (
    <div className="flex min-w-0 items-center gap-1 text-sm">
      {/* Your picture and name open your dashboard: the events you're going to.
          On phones only the picture shows; the name stays readable to screen readers. */}
      <NavLink
        to="/me"
        end
        title="My events"
        className={({ isActive }) =>
          `flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-1.5 font-medium transition ${
            isActive ? "bg-violet-50 text-violet-700" : "hover:bg-gray-100"
          }`
        }
      >
        <Avatar name={session.user.name} image={session.user.image} size="sm" />
        {/* not-sr-only resets overflow to visible, so the ellipsis lives on an inner
            span: long names are cut off with "…" instead of spilling over. */}
        <span className="sr-only lg:not-sr-only">
          <span className="block max-w-32 truncate">{session.user.name}</span>
        </span>
      </NavLink>
      <button
        type="button"
        onClick={handleSignOut}
        title="Sign out"
        aria-label="Sign out"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
      >
        <LogOut aria-hidden="true" className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}
