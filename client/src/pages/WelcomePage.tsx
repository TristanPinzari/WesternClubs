// WHAT: "/welcome", the onboarding step right after sign-up: (1) pick your interests,
//   (2) follow a few clubs, then go to the feed.
// WITHOUT IT: A brand-new student's "For you" feed would be empty, because it ranks
//   events by the clubs you follow and the interests on your profile.
import {
  EVENT_CATEGORIES,
  type ClubSummary,
  type EventCategory,
} from "@orbit/shared";
import { useEffect, useState } from "react";
import { btnQuiet, initialOf } from "../lib/ui";
import { Link, useNavigate } from "react-router";
import FollowClubButton from "../components/FollowClubButton";
import { authClient } from "../lib/auth-client";
import { listClubs } from "../lib/clubs";
import { categoryLabels } from "../lib/eventDisplay";
import { getProfile, saveMyProfile } from "../lib/profiles";

export default function WelcomePage() {
  const navigate = useNavigate();
  const { data: session, isPending, isRefetching } = authClient.useSession();
  const [step, setStep] = useState<"interests" | "clubs">("interests");
  const [interests, setInterests] = useState<EventCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from the interests already on your profile, so coming back to /welcome (or
  // refreshing mid-onboarding) never wipes them when you press Continue. If you've
  // already started picking before this loads, your picks win.
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    getProfile(userId)
      .then((profile) => {
        if (!ignore)
          setInterests((current) =>
            current.length === 0 ? profile.interests : current,
          );
      })
      .catch(() => {
        // Not fatal: you can still pick interests from scratch.
      });
    return () => {
      ignore = true;
    };
  }, [userId]);

  // Right after sign-up the session is still being fetched. Wait for it instead of
  // briefly telling a brand-new user to "sign in".
  if (isPending || (isRefetching && !session)) return null;
  if (!session) {
    return (
      <p className="text-gray-700">
        <Link to="/sign-in" className="font-medium text-violet-700 underline">
          Sign in
        </Link>{" "}
        to set up your feed.
      </p>
    );
  }

  function toggle(category: EventCategory) {
    setInterests((list) =>
      list.includes(category)
        ? list.filter((c) => c !== category)
        : [...list, category],
    );
  }

  async function saveInterests() {
    setSaving(true);
    setError(null);
    try {
      // PUT only changes the fields we send, so this leaves the rest of the
      // profile (program, bio, ...) untouched.
      await saveMyProfile({ interests });
      setStep("clubs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-violet-700">
        Step {step === "interests" ? 1 : 2} of 2
      </p>

      {step === "interests" ? (
        <>
          <h1 className="mt-1 text-2xl font-bold">
            Welcome to Orbit, {session.user.name.split(" ")[0]}!
          </h1>
          <p className="mt-2 text-gray-600">
            What are you into? We'll put events like these first in your feed.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {EVENT_CATEGORIES.map((category) => {
              const on = interests.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(category)}
                  className={`min-h-11 rounded-full border px-4 ${
                    on
                      ? "border-violet-700 bg-violet-700 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  {categoryLabels[category]}
                </button>
              );
            })}
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              onClick={saveInterests}
              disabled={saving || interests.length === 0}
              className="min-h-11 rounded-lg bg-violet-700 px-6 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Continue"}
            </button>
            <button
              type="button"
              onClick={() => setStep("clubs")}
              className={btnQuiet}
            >
              Skip
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-1 text-2xl font-bold">Follow a few clubs</h1>
          <p className="mt-2 text-gray-600">
            Events from clubs you follow show up first in your feed.
          </p>
          <ClubPicker />
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-6 min-h-11 w-full rounded-lg bg-violet-700 px-6 font-semibold text-white sm:w-auto"
          >
            Done
          </button>
        </>
      )}
    </div>
  );
}

// The club list with a Follow button on each. Each button saves on its own click,
// so "Done" has nothing left to save.
function ClubPicker() {
  const [clubs, setClubs] = useState<ClubSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    listClubs("")
      .then((page) => !ignore && setClubs(page.items))
      .catch((err: Error) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, []);

  if (error) return <p className="mt-4 text-red-600">{error}</p>;
  if (!clubs) return <p className="mt-4 text-gray-600">Loading clubs…</p>;
  if (clubs.length === 0)
    return <p className="mt-4 text-gray-600">No clubs yet.</p>;

  return (
    <ul className="mt-5 space-y-3">
      {clubs.map((club) => (
        <li
          key={club.id}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
        >
          {club.logoUrl ? (
            <img
              src={club.logoUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-100 font-semibold text-violet-800"
            >
              {initialOf(club.name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{club.name}</p>
            <p className="line-clamp-2 text-sm text-gray-600">
              {club.description}
            </p>
          </div>
          {/* A new account follows nothing yet, so every button starts as "Follow". */}
          <div className="shrink-0">
            <FollowClubButton clubId={club.id} initialFollowing={false} />
          </div>
        </li>
      ))}
    </ul>
  );
}
