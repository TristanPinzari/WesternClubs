// WHAT: A row of round icon buttons for a club's or student's external links
//   (Instagram, LinkedIn, GitHub, Discord, website), used on profiles and club pages.
// WITHOUT IT: Links showed as plain underlined words, and each page drew them its own way.
import type { LinkKind, Links } from "@orbit/shared";
import { Globe } from "lucide-react";
import { siDiscord, siGithub, siInstagram, siLinktree } from "simple-icons";
import { registrationLink } from "../lib/eventDisplay";
import { linkLabels } from "../lib/profiles";

// Brand marks come from simple-icons (accurate, single-colour). LinkedIn isn't in
// simple-icons or lucide (LinkedIn asked for its logo to be removed), so it's drawn
// here as the familiar "in" mark in the same style.
const LINKEDIN_PATH =
  "M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z";

const brandPaths: Partial<Record<LinkKind, string>> = {
  instagram: siInstagram.path,
  linktree: siLinktree.path,
  github: siGithub.path,
  discord: siDiscord.path,
  linkedin: LINKEDIN_PATH,
};

function LinkIcon({ kind }: { kind: LinkKind }) {
  const path = brandPaths[kind];
  if (!path) return <Globe aria-hidden="true" className="h-5 w-5" />;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4.5 w-4.5"
      fill="currentColor"
    >
      <path d={path} />
    </svg>
  );
}

// The order links appear in, regardless of the order they were saved.
const ORDER: LinkKind[] = [
  "instagram",
  "linktree",
  "linkedin",
  "github",
  "discord",
  "website",
];

// The links that will actually be shown: known kinds with an http(s) URL, in ORDER.
// Exported so a page can decide whether to show a "Links" heading by the same rule.
export function socialLinkItems(links: Links) {
  return ORDER.flatMap((kind) => {
    const href = registrationLink(links[kind] ?? null);
    return href ? [{ kind, href }] : [];
  });
}

export default function SocialLinks({
  links,
  className = "",
}: {
  links: Links;
  className?: string;
}) {
  // Only http(s) links are ever rendered, even if bad data slipped into the database.
  const items = socialLinkItems(links);
  if (items.length === 0) return null;

  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {items.map(({ kind, href }) => (
        <li key={kind}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={linkLabels[kind]}
            aria-label={`${linkLabels[kind]} (opens in a new tab)`}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-violet-300 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
          >
            <LinkIcon kind={kind} />
          </a>
        </li>
      ))}
    </ul>
  );
}
