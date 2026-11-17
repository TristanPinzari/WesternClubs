// WHAT: The app's shell: the header/nav that appears on every page, plus the list of
//   routes (which URL shows which page). Add new pages to <Routes> here.
// WITHOUT IT: There'd be no navigation, and no URL would show any page.
import { NavLink, Route, Routes } from "react-router";
import UserMenu from "./components/UserMenu";
import ClubsPage from "./pages/ClubsPage";
import HomePage from "./pages/HomePage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "font-semibold text-violet-700" : "text-gray-600";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-2xl items-center gap-6 px-4 py-3">
          <span className="text-lg font-bold text-violet-700">Orbit</span>
          <NavLink to="/" end className={navLinkClass}>
            Events
          </NavLink>
          <NavLink to="/clubs" className={navLinkClass}>
            Clubs
          </NavLink>
          <UserMenu />
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/clubs" element={<ClubsPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          {/* TODO: add pages as you build them, e.g.
              /events/:id, /clubs/:slug, /me (dashboard), /profile/:id */}
        </Routes>
      </main>
    </div>
  );
}
