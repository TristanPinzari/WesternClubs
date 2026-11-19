// WHAT: The app's shell: the header/nav that appears on every page, plus the list of
//   routes (which URL shows which page). Add new pages to <Routes> here.
// WITHOUT IT: There'd be no navigation, and no URL would show any page.
import { NavLink, Route, Routes } from "react-router";
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

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "font-semibold text-violet-700" : "text-gray-600";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <span className="text-lg font-bold text-violet-700">Orbit</span>
          <NavLink to="/" end className={navLinkClass}>
            Events
          </NavLink>
          <NavLink to="/me/clubs" className={navLinkClass}>
            My clubs
          </NavLink>
          <NavLink to="/clubs" className={navLinkClass}>
            Clubs
          </NavLink>
          <NavLink to="/people" className={navLinkClass}>
            People
          </NavLink>
          {/* Demo identities never call real auth; live mode uses Rokyo's merged menu. */}
          {!useMockExec && <UserMenu />}
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
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
