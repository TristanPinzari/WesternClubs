// WHAT: The app's shell: the header/nav that appears on every page, plus the list of
//   routes (which URL shows which page). Add new pages to <Routes> here.
// WITHOUT IT: There'd be no navigation, and no URL would show any page.
import { NavLink, Route, Routes } from "react-router";
import ClubsPage from "./pages/ClubsPage";
import HomePage from "./pages/HomePage";
import EventDetailPage from "./pages/EventDetailPage";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "font-semibold text-violet-700" : "text-gray-600";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-2xl items-center gap-6 px-4 py-3">
          <span className="text-lg font-bold text-violet-700">Orbit</span>
          <NavLink to="/" end className={navLinkClass}>
            Events
          </NavLink>
          <NavLink to="/clubs" className={navLinkClass}>
            Clubs
          </NavLink>
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/clubs" element={<ClubsPage />} />
          {/* :id becomes useParams().id on the detail page; cards link here. */}
          <Route path="/events/:id" element={<EventDetailPage />} />
          {/* TODO: add pages as you build them, e.g.
              /clubs/:slug, /sign-in, /sign-up, /me (dashboard), /profile/:id */}
        </Routes>
      </main>
    </div>
  );
}
