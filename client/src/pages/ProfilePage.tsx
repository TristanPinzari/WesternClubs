// WHAT: "/profile/:userId": a student's public profile, with a Follow button.
//   Data from GET /api/profiles/:userId; following via PUT/DELETE /api/users/:id/follow.
// WITHOUT IT: Names on attendee lists would lead nowhere, and there'd be no way to
//   follow someone you met at an event.
import type { Profile } from "@orbit/shared";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import Avatar from "../components/Avatar";
import SocialLinks, { socialLinkItems } from "../components/SocialLinks";
import { btnDanger } from "../lib/ui";
import { authClient } from "../lib/auth-client";
import { categoryLabels } from "../lib/eventDisplay";
import {
  getProfile,
  setBlocked,
  setFollowing,
  yearLabel,
} from "../lib/profiles";

export default function ProfilePage() {
  const { userId } = useParams();
  const { data: session, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [blockedThem, setBlockedThem] = useState(false);

  const me = session?.user;
  useEffect(() => {
    if (!userId || !me) return;
    let ignore = false;
    setProfile(null);
    setBlockedThem(false);
    setError(null);
    getProfile(userId)
      .then((p) => !ignore && setProfile(p))
      .catch((err: Error) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, [userId, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isPending) return null;
  if (!me) {
    return (
      <p className="text-gray-700">
        <Link to="/sign-in" className="font-medium text-violet-700 underline">
          Sign in
        </Link>{" "}
        to see student profiles.
      </p>
    );
  }

  if (error) {
    // The API answers 404 both for "doesn't exist" and "is private", on purpose:
    // it shouldn't reveal that a private profile exists.
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h1 className="text-xl font-bold">Profile not available</h1>
        <p className="mt-2 text-gray-600">
          This profile is private or doesn't exist.
        </p>
      </div>
    );
  }
  if (!profile) return <p className="text-gray-600">Loading…</p>;

  const isMe = profile.userId === me.id;
  const links = socialLinkItems(profile.links);

  async function toggleFollow() {
    if (!profile) return;
    const next = !profile.isFollowing;
    setFollowBusy(true);
    setFollowError(null);
    try {
      await setFollowing(profile.userId, next);
      setProfile({ ...profile, isFollowing: next });
    } catch (err) {
      setFollowError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setFollowBusy(false);
    }
  }

  // Someone can see you on attendee lists without following you, so blocking is
  // offered here too, not only on the Followers page.
  async function block() {
    if (!profile) return;
    if (
      !window.confirm(
        `Block ${profile.name}? They won't be able to see your profile, find you in search, or see you on attendee lists, and they'll stop following you. They won't be told.`,
      )
    )
      return;
    setFollowBusy(true);
    setFollowError(null);
    try {
      await setBlocked(profile.userId, true);
      setBlockedThem(true);
    } catch (err) {
      setFollowError(err instanceof Error ? err.message : "Could not block.");
    } finally {
      setFollowBusy(false);
    }
  }

  return (
    <article>
      <div className="flex items-center gap-4">
        <Avatar name={profile.name} image={profile.image} size="lg" />
        <div className="min-w-0">
          <h1 className="wrap-break-word text-2xl font-bold">{profile.name}</h1>
          {(profile.program || profile.yearOfStudy) && (
            <p className="text-gray-600">
              {[
                profile.program,
                profile.yearOfStudy && yearLabel(profile.yearOfStudy),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* No follower count anywhere, by design: WesternClubs isn't a popularity contest. */}
      <div className="mt-4">
        {isMe ? (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/me/profile"
              className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 px-4 font-medium"
            >
              Edit profile
            </Link>
            {!profile.isPublic && (
              <span className="text-sm text-gray-600">
                Your profile is private. Only you can see it.
              </span>
            )}
          </div>
        ) : blockedThem ? (
          <p className="text-sm text-gray-700">
            You blocked {profile.name}. Unblock them from your{" "}
            <Link to="/me/followers" className="text-violet-700 underline">
              Followers page
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleFollow}
              disabled={followBusy}
              aria-pressed={profile.isFollowing}
              className={`min-h-11 rounded-lg px-5 font-semibold disabled:opacity-50 ${
                profile.isFollowing
                  ? "border border-gray-300 text-gray-800"
                  : "bg-violet-700 text-white"
              }`}
            >
              {profile.isFollowing ? "Following" : "Follow"}
            </button>
            <button
              type="button"
              onClick={block}
              disabled={followBusy}
              className={btnDanger}
            >
              Block
            </button>
          </div>
        )}
        {followError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {followError}
          </p>
        )}
      </div>

      {profile.bio && (
        <p className="mt-6 whitespace-pre-wrap wrap-break-word text-gray-800">
          {profile.bio}
        </p>
      )}

      {profile.interests.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700">Interests</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <li
                key={interest}
                className="rounded-full bg-violet-50 px-3 py-1 text-sm text-violet-800"
              >
                {categoryLabels[interest]}
              </li>
            ))}
          </ul>
        </section>
      )}

      {links.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700">Links</h2>
          <SocialLinks links={profile.links} className="mt-2" />
        </section>
      )}

      {isMe &&
        !profile.bio &&
        profile.interests.length === 0 &&
        links.length === 0 && (
          <p className="mt-6 text-gray-600">
            Your profile is empty.{" "}
            <Link to="/me/profile" className="text-violet-700 underline">
              Add your program, interests, and a short bio
            </Link>{" "}
            so people you meet at events can find you.
          </p>
        )}
    </article>
  );
}
