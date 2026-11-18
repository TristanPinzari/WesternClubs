// WHAT: Fictional Western-themed clubs and events used by Aryan's demo seed.
// WITHOUT IT: The app would lack varied examples across all six categories.
import type { EventCategory } from "@orbit/shared";

export const demoClubs = [
  {
    name: "Western AI",
    slug: "western-ai",
    description:
      "Workshops, speaker nights, and projects for students interested in AI.",
  },
  {
    name: "Western Finance Association",
    slug: "western-finance-association",
    description:
      "Networking events and case competitions for aspiring finance professionals.",
  },
  {
    name: "Western Outdoors Club",
    slug: "western-outdoors-club",
    description: "Hiking, climbing, and camping trips around Ontario.",
  },
  {
    name: "Western Art Collective",
    slug: "western-art-collective",
    description:
      "A demo club for student art workshops, sketching, and exhibitions.",
  },
  {
    name: "Western Board Games Club",
    slug: "western-board-games",
    description:
      "A demo club for cooperative games, casual socials, and new friendships.",
  },
  {
    name: "Western Science Society",
    slug: "western-science-society",
    description:
      "A demo club for peer study sessions and conversations about science.",
  },
  {
    name: "Western Music Circle",
    slug: "western-music-circle",
    description:
      "A demo club for student performances and beginner-friendly jam sessions.",
  },
  {
    name: "Western Photography Circle",
    slug: "western-photography-circle",
    description:
      "A demo club for photography walks, editing workshops, and creative projects.",
  },
  {
    name: "Western Social Runners",
    slug: "western-social-runners",
    description: "A demo club for friendly runs and walks around campus.",
  },
] as const;

type DemoEvent = {
  // Keep these keys stable when editing or reordering entries: they identify seed-owned rows.
  key: number;
  clubSlug: (typeof demoClubs)[number]["slug"];
  title: string;
  description: string;
  category: EventCategory;
  daysFromNow: number;
  location: string;
  priceCents: number;
};

// 24 upcoming examples: four per category, scheduled over the next 24 days.
// These are sample listings, not claims about actual club schedules or registrations.
export const demoEvents: DemoEvent[] = [
  {
    key: 1,
    clubSlug: "western-ai",
    title: "Build Your First AI Study Tool",
    description:
      "Bring your laptop and build a small revision assistant with other beginners.",
    category: "technology",
    daysFromNow: 1,
    location: "Middlesex College 105",
    priceCents: 0,
  },
  {
    key: 2,
    clubSlug: "western-science-society",
    title: "Calculus Practice Circle",
    description:
      "Work through practice problems in small groups and share study strategies.",
    category: "academic",
    daysFromNow: 2,
    location: "Taylor Library study rooms",
    priceCents: 0,
  },
  {
    key: 3,
    clubSlug: "western-finance-association",
    title: "Careers in Finance Coffee Chat",
    description:
      "Meet upper-year students and discuss co-op applications over coffee.",
    category: "networking",
    daysFromNow: 3,
    location: "Ivey Business School atrium",
    priceCents: 500,
  },
  {
    key: 4,
    clubSlug: "western-board-games",
    title: "Cooperative Board Game Night",
    description:
      "Try beginner-friendly games with new friends. Games and snacks are provided.",
    category: "social",
    daysFromNow: 4,
    location: "University Community Centre lounge",
    priceCents: 0,
  },
  {
    key: 5,
    clubSlug: "western-outdoors-club",
    title: "Thames Valley Trail Walk",
    description:
      "Join a relaxed walk near campus. Dress for the weather and bring water.",
    category: "sports_recreation",
    daysFromNow: 5,
    location: "Meet outside Alumni Hall",
    priceCents: 0,
  },
  {
    key: 6,
    clubSlug: "western-art-collective",
    title: "Watercolour and Conversation",
    description:
      "Learn simple watercolour techniques in a welcoming studio session. Supplies included.",
    category: "arts_culture",
    daysFromNow: 6,
    location: "John Labatt Visual Arts Centre",
    priceCents: 800,
  },
  {
    key: 7,
    clubSlug: "western-ai",
    title: "Student Web Projects Build Night",
    description:
      "Bring an unfinished project or join a small team to make a campus web app.",
    category: "technology",
    daysFromNow: 7,
    location: "Spencer Engineering Building",
    priceCents: 0,
  },
  {
    key: 8,
    clubSlug: "western-science-society",
    title: "Biology Revision Workshop",
    description:
      "Compare revision techniques and practise explaining key concepts with peers.",
    category: "academic",
    daysFromNow: 8,
    location: "Natural Sciences Centre 145",
    priceCents: 0,
  },
  {
    key: 9,
    clubSlug: "western-ai",
    title: "Meet Your Next Project Teammate",
    description:
      "Introduce your interests and meet students looking for project collaborators.",
    category: "networking",
    daysFromNow: 9,
    location: "University Community Centre",
    priceCents: 0,
  },
  {
    key: 10,
    clubSlug: "western-board-games",
    title: "Campus Trivia and Snacks",
    description:
      "Team up for a relaxed trivia evening covering music, campus life, and general knowledge.",
    category: "social",
    daysFromNow: 10,
    location: "The Spoke",
    priceCents: 500,
  },
  {
    key: 11,
    clubSlug: "western-social-runners",
    title: "Beginner Run and Walk Meetup",
    description:
      "Choose a walk or an easy run around campus. All paces are welcome.",
    category: "sports_recreation",
    daysFromNow: 11,
    location: "Meet at University College steps",
    priceCents: 0,
  },
  {
    key: 12,
    clubSlug: "western-music-circle",
    title: "Student Acoustic Open Mic",
    description:
      "Listen to student performers or bring a short acoustic piece to share.",
    category: "arts_culture",
    daysFromNow: 12,
    location: "Talbot College common area",
    priceCents: 0,
  },
  {
    key: 13,
    clubSlug: "western-ai",
    title: "Introduction to Data Visualisation",
    description:
      "Turn a small dataset into clear charts in a hands-on laptop workshop.",
    category: "technology",
    daysFromNow: 13,
    location: "Middlesex College computer lab",
    priceCents: 0,
  },
  {
    key: 14,
    clubSlug: "western-finance-association",
    title: "Student Budgeting Workshop",
    description:
      "Practise making a student budget with fictional examples and compare saving habits.",
    category: "academic",
    daysFromNow: 14,
    location: "Ivey Business School classroom",
    priceCents: 0,
  },
  {
    key: 15,
    clubSlug: "western-finance-association",
    title: "Case Competition Team Mixer",
    description:
      "Meet potential teammates and discuss what to expect at your first case competition.",
    category: "networking",
    daysFromNow: 15,
    location: "Ivey Business School atrium",
    priceCents: 1000,
  },
  {
    key: 16,
    clubSlug: "western-outdoors-club",
    title: "Hot Chocolate and Adventure Stories",
    description:
      "Share your favourite outdoor memory and meet other students over warm drinks.",
    category: "social",
    daysFromNow: 16,
    location: "University Community Centre lounge",
    priceCents: 300,
  },
  {
    key: 17,
    clubSlug: "western-outdoors-club",
    title: "Indoor Climbing Taster",
    description:
      "Try a supervised introduction to climbing. Comfortable clothing is recommended.",
    category: "sports_recreation",
    daysFromNow: 17,
    location: "Junction Climbing Centre",
    priceCents: 1800,
  },
  {
    key: 18,
    clubSlug: "western-photography-circle",
    title: "Campus Architecture Photo Walk",
    description:
      "Explore framing and lighting while photographing campus buildings. Phones welcome.",
    category: "arts_culture",
    daysFromNow: 18,
    location: "Meet at University College",
    priceCents: 0,
  },
  {
    key: 19,
    clubSlug: "western-ai",
    title: "Responsible AI Discussion Lab",
    description:
      "Explore fairness and privacy through small-group design exercises.",
    category: "technology",
    daysFromNow: 19,
    location: "Spencer Engineering Building",
    priceCents: 0,
  },
  {
    key: 20,
    clubSlug: "western-science-society",
    title: "Research Poster Practice Session",
    description:
      "Bring a draft poster or explain an idea and get constructive peer feedback.",
    category: "academic",
    daysFromNow: 20,
    location: "Weldon Library study space",
    priceCents: 0,
  },
  {
    key: 21,
    clubSlug: "western-art-collective",
    title: "Creative Collaborators Meetup",
    description:
      "Meet students interested in illustration, writing, photography, and music projects.",
    category: "networking",
    daysFromNow: 21,
    location: "John Labatt Visual Arts Centre",
    priceCents: 0,
  },
  {
    key: 22,
    clubSlug: "western-board-games",
    title: "Puzzle Night and Tea",
    description:
      "Solve collaborative puzzles in small groups. No special experience required.",
    category: "social",
    daysFromNow: 22,
    location: "University Community Centre lounge",
    priceCents: 400,
  },
  {
    key: 23,
    clubSlug: "western-social-runners",
    title: "Indoor Stretch and Mobility",
    description:
      "Join a gentle mobility session with student volunteers. Bring a mat and water.",
    category: "sports_recreation",
    daysFromNow: 23,
    location: "Western Student Recreation Centre",
    priceCents: 0,
  },
  {
    key: 24,
    clubSlug: "western-art-collective",
    title: "Collage and Zine Workshop",
    description:
      "Make a small paper zine using collage and drawing. Materials are provided.",
    category: "arts_culture",
    daysFromNow: 24,
    location: "John Labatt Visual Arts Centre",
    priceCents: 600,
  },
];

// Deterministic UUIDs let repeated seeds refresh only these demo rows, not user events.
export function demoEventId(key: number) {
  return `a7a10000-0000-4000-8000-${String(key).padStart(12, "0")}`;
}

export function demoStartsAt(days: number, now = new Date()) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + days);
  // Explicit UTC avoids changes caused by the machine's time-zone settings.
  date.setUTCHours(22, 0, 0, 0);
  return date;
}
