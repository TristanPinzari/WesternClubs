// WHAT: The app's shell: the header/nav that appears on every page, plus the list of
//   routes (which URL shows which page). Add new pages to <Routes> here.
// WITHOUT IT: There'd be no navigation, and no URL would show any page.
import {
  Building2,
  Compass,
  Orbit as OrbitIcon,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link, NavLink, Route, Routes } from "react-router";
import UserMenu from "./components/UserMenu";
import ClubsPage from "./pages/ClubsPage";
import EditProfilePage from "./pages/EditProfilePage";
import FollowersPage from "./pages/FollowersPage";
import FollowingPage from "./pages/FollowingPage";
import HomePage from "./pages/HomePage";
import EventDetailPage from "./pages/EventDetailPage";
import MyEventsPage from "./pages/MyEventsPage";
import PeoplePage from "./pages/PeoplePage";
import ProfilePage from "./pages/ProfilePage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import WelcomePage from "./pages/WelcomePage";
import ClubDetailPage from "./pages/ClubDetailPage";
import CreateClubPage from "./pages/CreateClubPage";
import ClubSettingsPage from "./pages/ClubSettingsPage";
import EventEditorPage from "./pages/EventEditorPage";
import MyClubsPage from "./pages/MyClubsPage";
import { useMockExec } from "./lib/demoMode";

// Top nav (768px and up): centred text links.
const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition ${
    isActive
      ? "bg-violet-50 text-violet-700"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;

// Bottom tab bar (phones): icon above a short label, like a mobile app.
const tabLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
    isActive ? "text-violet-700" : "text-gray-500"
  }`;

// The same four destinations appear in the top nav on wider screens and in the bottom
// tab bar on phones.
const NAV = [
  { to: "/", label: "Events", Icon: Compass, end: true },
  { to: "/clubs", label: "Clubs", Icon: Building2, end: false },
  { to: "/people", label: "People", Icon: UsersRound, end: false },
  { to: "/me/clubs", label: "My clubs", Icon: ShieldCheck, end: false },
];

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
        {/* Three columns: logo left, links centred, account right. The two outer
            columns are equal width (1fr), which is what keeps the links truly centred. */}
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2.5 md:grid md:grid-cols-[1fr_auto_1fr]">
          <Link
            to="/"
            className="flex items-center gap-1.5 justify-self-start text-lg font-bold text-violet-700"
          >
            <OrbitIcon aria-hidden="true" className="h-6 w-6" />
            Orbit
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={navLinkClass}>
                {label}
              </NavLink>
            ))}
          </div>
          {/* Demo identities never call real auth; live mode uses Rokyo's merged menu. */}
          <div className="flex min-w-0 justify-end">
            {!useMockExec && <UserMenu />}
          </div>
        </nav>
      </header>

      {/* Phones: the main destinations live in a bottom tab bar, within thumb reach. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={tabLinkClass}>
            <Icon aria-hidden="true" className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Extra bottom padding on phones so the tab bar never covers the last item. */}
      <main className="mx-auto max-w-2xl px-4 pt-6 pb-24 md:pb-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/clubs" element={<ClubsPage />} />
          <Route path="/clubs/new" element={<CreateClubPage />} />
          <Route path="/clubs/:slug" element={<ClubDetailPage />} />
          <Route path="/clubs/:slug/settings" element={<ClubSettingsPage />} />
          <Route path="/clubs/:slug/events/new" element={<EventEditorPage />} />
          <Route path="/me/clubs" element={<MyClubsPage />} />
          <Route path="/events/:id/edit" element={<EventEditorPage />} />
          {/* :id becomes useParams().id on the detail page; cards link here. */}
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/me" element={<MyEventsPage />} />
          <Route path="/me/profile" element={<EditProfilePage />} />
          <Route path="/me/following" element={<FollowingPage />} />
          <Route path="/me/followers" element={<FollowersPage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  );
}
