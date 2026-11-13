// WHAT: The home page ("/"), which will become the main event feed. Currently a placeholder.
// WITHOUT IT: Visiting the site's root URL would show an empty page under the header.
//
// TODO: the event feed. Model it on ClubsPage.tsx:
//   - fetch GET /api/events (see docs/API.md)
//   - search box + category filter chips (EVENT_CATEGORIES from @orbit/shared)
//   - an EventCard component showing title, club, date/time, location, price
export default function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Upcoming events</h1>
      <p className="mt-2 text-gray-600">
        Coming soon. Check out the Clubs tab for a working example.
      </p>
    </div>
  );
}
