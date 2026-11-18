// WHAT: Six fictional listings for frontend development without Express or Neon.
// WITHOUT IT: Aryan's UI testing would depend on the backend being available.
import type { EventDetail } from "@orbit/shared";

function futureDate(days: number, hour: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

// These use Naksh's real shared type, so changes to his API shape cause a type error.
// example.org is intentionally a placeholder, not an official registration page.
export const mockEvents: EventDetail[] = [
  {
    id: "mock-ai-workshop",
    title: "Build Your First AI Project",
    description:
      "Bring a laptop and learn to build a small study-planning tool. No previous AI experience needed.",
    category: "technology",
    startsAt: futureDate(1, 22),
    endsAt: futureDate(2, 0),
    location: "Middlesex College 105",
    priceCents: 0,
    imageUrl: null,
    club: { id: "mock-ai", name: "Western AI", slug: "western-ai" },
    eligibility: "Open to all Western students. Bring your laptop.",
    registrationUrl: "https://example.org/register/ai-workshop",
    cancelledAt: null,
  },
  {
    id: "mock-study-session",
    title: "Exam Prep Study Circle",
    description:
      "Work through practice problems with other students and share revision strategies.",
    category: "academic",
    startsAt: futureDate(2, 20),
    endsAt: null,
    location: "Taylor Library study rooms",
    priceCents: 0,
    imageUrl: null,
    club: {
      id: "mock-science",
      name: "Western Science Society",
      slug: "western-science-society",
    },
    eligibility: "All years welcome.",
    registrationUrl: null,
    cancelledAt: null,
  },
  {
    id: "mock-finance-mixer",
    title: "Finance Careers Mixer",
    description:
      "Meet upper-year students and practise your introduction over refreshments.",
    category: "networking",
    startsAt: futureDate(3, 22),
    endsAt: futureDate(4, 0),
    location: "Ivey Business School atrium",
    priceCents: 1500,
    imageUrl: null,
    club: {
      id: "mock-finance",
      name: "Western Finance Association",
      slug: "western-finance-association",
    },
    eligibility: "Western students from any program.",
    registrationUrl: "https://example.org/register/finance-mixer",
    cancelledAt: null,
  },
  {
    id: "mock-games-night",
    title: "Board Games and Hot Chocolate",
    description:
      "Drop in for cooperative games and meet someone new. Games are provided.",
    category: "social",
    startsAt: futureDate(4, 23),
    endsAt: null,
    location: "University Community Centre lounge",
    priceCents: 500,
    imageUrl: null,
    club: {
      id: "mock-games",
      name: "Western Board Games Club",
      slug: "western-board-games",
    },
    eligibility: "All Western students welcome; come solo or with friends.",
    registrationUrl: null,
    cancelledAt: null,
  },
  {
    id: "mock-trail-walk",
    title: "Thames Valley Trail Walk",
    description:
      "Enjoy a beginner-friendly group walk. Wear comfortable shoes and dress for the weather.",
    category: "sports_recreation",
    startsAt: futureDate(5, 15),
    endsAt: futureDate(5, 17),
    location: "Meet outside Alumni Hall",
    priceCents: 0,
    imageUrl: null,
    club: {
      id: "mock-outdoors",
      name: "Western Outdoors Club",
      slug: "western-outdoors-club",
    },
    eligibility: "All fitness levels welcome.",
    registrationUrl: null,
    cancelledAt: null,
  },
  {
    id: "mock-art-night",
    title: "Watercolour and Conversation",
    description:
      "Try watercolour painting with a student-led demonstration. Supplies are included.",
    category: "arts_culture",
    startsAt: futureDate(6, 22),
    endsAt: futureDate(7, 0),
    location: "John Labatt Visual Arts Centre",
    priceCents: 800,
    imageUrl: null,
    club: {
      id: "mock-art",
      name: "Western Art Collective",
      slug: "western-art-collective",
    },
    eligibility: "No art experience needed.",
    registrationUrl: "https://example.org/register/art-night",
    cancelledAt: null,
  },
];
