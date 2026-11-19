// WHAT: The "Following | Followers" switch at the top of /me/following and /me/followers.
// WITHOUT IT: The two related pages could only reach each other through a text link.
import { NavLink } from "react-router";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 flex-1 items-center justify-center rounded-md px-4 text-sm font-medium transition ${
    isActive
      ? "bg-white text-gray-900 shadow-sm"
      : "text-gray-600 hover:text-gray-900"
  }`;

export default function FollowTabs() {
  return (
    <nav
      aria-label="Following and followers"
      className="flex max-w-sm gap-1 rounded-lg bg-gray-100 p-1"
    >
      <NavLink to="/me/following" className={tabClass}>
        Following
      </NavLink>
      <NavLink to="/me/followers" className={tabClass}>
        Followers
      </NavLink>
    </nav>
  );
}
