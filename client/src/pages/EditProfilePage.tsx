// WHAT: "/me/profile": edit your own profile (program, year, bio, interests, links,
//   public/private). Saves with PUT /api/me/profile.
// WITHOUT IT: Profiles would be empty, the "For you" feed would have no interests to
//   match, and nobody could make their profile private.
import {
  EVENT_CATEGORIES,
  LINK_KINDS,
  updateProfileSchema,
  type EventCategory,
  type LinkKind,
  type Profile,
} from "@orbit/shared";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import Avatar from "../components/Avatar";
import ImageUpload from "../components/ImageUpload";
import { authClient } from "../lib/auth-client";
import { categoryLabels } from "../lib/eventDisplay";
import {
  getProfile,
  linkLabels,
  saveMyProfile,
  yearLabel,
} from "../lib/profiles";

// The form keeps every field as a string (that's what inputs give us) and converts
// to the API's types only when saving.
interface FormState {
  program: string;
  yearOfStudy: string; // "" = not set
  bio: string;
  interests: EventCategory[];
  links: Record<LinkKind, string>;
  isPublic: boolean;
}

const toForm = (p: Profile): FormState => ({
  program: p.program ?? "",
  yearOfStudy: p.yearOfStudy ? String(p.yearOfStudy) : "",
  bio: p.bio ?? "",
  interests: p.interests,
  // One text box per link kind, "" when not set.
  links: Object.fromEntries(
    LINK_KINDS.map((kind) => [kind, p.links[kind] ?? ""]),
  ) as Record<LinkKind, string>,
  isPublic: p.isPublic,
});

const BIO_MAX = 300;

export default function EditProfilePage() {
  const { data: session, isPending } = authClient.useSession();
  const [form, setForm] = useState<FormState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pictureBusy, setPictureBusy] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);

  const user = session?.user;
  useEffect(() => {
    if (!user) return;
    let ignore = false;
    getProfile(user.id)
      .then((p) => !ignore && setForm(toForm(p)))
      .catch((err: Error) => !ignore && setLoadError(err.message));
    return () => {
      ignore = true;
    };
    // Only reload when the signed-in user changes (their id), not every time the
    // session object is refreshed, which would wipe unsaved edits.
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isPending) return null;
  if (!user) {
    return (
      <p className="text-gray-700">
        <Link to="/sign-in" className="font-medium text-violet-700 underline">
          Sign in
        </Link>{" "}
        to edit your profile.
      </p>
    );
  }

  // Copies the form with some fields changed, and clears the "Saved" message.
  const update = (changes: Partial<FormState>) => {
    setForm((f) => (f ? { ...f, ...changes } : f));
    setSaved(false);
  };

  // The picture lives on your account (Better Auth's user.image), not in the profile,
  // so it saves right away instead of waiting for "Save profile". null removes it.
  // The server only accepts URLs from our own uploads, in your own users/ folder.
  async function savePicture(url: string | null) {
    setPictureBusy(true);
    setPictureError(null);
    try {
      const { error } = await authClient.updateUser({ image: url });
      if (error) setPictureError(error.message ?? "Could not save picture.");
      // On success useSession() refreshes, so the avatar here and in the header update.
    } catch {
      setPictureError("Couldn't reach the server. Try again.");
    } finally {
      setPictureBusy(false);
    }
  }

  function toggleInterest(category: EventCategory) {
    if (!form) return;
    update({
      interests: form.interests.includes(category)
        ? form.interests.filter((c) => c !== category)
        : [...form.interests, category],
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form || !user) return;

    // Drop empty link fields, then validate with the SAME schema the server uses,
    // so mistakes (like a link without https://) show up before sending.
    const links = Object.fromEntries(
      Object.entries(form.links).filter(([, url]) => url.trim() !== ""),
    );
    const parsed = updateProfileSchema.safeParse({
      program: form.program,
      yearOfStudy: form.yearOfStudy ? Number(form.yearOfStudy) : null,
      bio: form.bio,
      interests: form.interests,
      links,
      isPublic: form.isPublic,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path[0] === "links" ? issue.path[1] : issue.path[0];
      setSaveError(
        issue.path[0] === "links"
          ? `${linkLabels[field as LinkKind]} must be a full link starting with https://`
          : issue.message,
      );
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await saveMyProfile(parsed.data);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Edit profile</h1>
        <Link
          to={`/profile/${user.id}`}
          className="text-sm font-medium text-violet-700 underline"
        >
          View profile
        </Link>
      </div>
      {loadError && <p className="mt-4 text-red-600">{loadError}</p>}
      {!form && !loadError && <p className="mt-4 text-gray-600">Loading…</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
          <div className="flex items-start gap-4">
            <Avatar name={user.name} image={user.image} size="lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-semibold">{user.name}</p>
              {/* Uploads straight to storage, then saves the picture's URL on your
                  account. No preview here: the avatar next to it updates instead. */}
              <ImageUpload
                folder="users"
                label="Profile picture"
                onChange={(image) => image && savePicture(image.publicUrl)}
                onBusyChange={setPictureBusy}
              />
              {user.image && (
                <button
                  type="button"
                  disabled={pictureBusy}
                  onClick={() => savePicture(null)}
                  className="min-h-11 text-sm text-gray-600 underline disabled:opacity-50"
                >
                  Remove picture
                </button>
              )}
              {pictureError && (
                <p role="alert" className="text-sm text-red-600">
                  {pictureError}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <label className="block">
              <span className="text-sm font-medium">Program</span>
              <input
                type="text"
                value={form.program}
                maxLength={100}
                placeholder="e.g. Computer Science"
                onChange={(e) => update({ program: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Year</span>
              <select
                value={form.yearOfStudy}
                onChange={(e) => update({ yearOfStudy: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
              >
                <option value="">Not set</option>
                {[1, 2, 3, 4, 5].map((year) => (
                  <option key={year} value={year}>
                    {yearLabel(year)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium">Bio</span>
            <textarea
              value={form.bio}
              maxLength={BIO_MAX}
              rows={3}
              placeholder="A sentence or two about you"
              onChange={(e) => update({ bio: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            />
            <span className="block text-right text-xs text-gray-500">
              {form.bio.length}/{BIO_MAX}
            </span>
          </label>

          <fieldset>
            <legend className="text-sm font-medium">Interests</legend>
            <p className="text-sm text-gray-600">
              Events in these categories show up higher in your feed.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EVENT_CATEGORIES.map((category) => {
                const on = form.interests.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleInterest(category)}
                    className={`min-h-9 rounded-full border px-3 text-sm ${
                      on
                        ? "border-violet-700 bg-violet-700 text-white"
                        : "border-gray-300 text-gray-700"
                    }`}
                  >
                    {categoryLabels[category]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">
              Links <span className="text-gray-500">(optional)</span>
            </legend>
            {LINK_KINDS.map((key) => (
              <label key={key} className="block">
                <span className="text-sm text-gray-700">{linkLabels[key]}</span>
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={form.links[key]}
                  onChange={(e) =>
                    update({ links: { ...form.links, [key]: e.target.value } })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                />
              </label>
            ))}
          </fieldset>

          <label className="flex items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-gray-200">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => update({ isPublic: e.target.checked })}
              className="mt-1 h-4 w-4 accent-violet-700"
            />
            <span>
              <span className="block font-medium">Public profile</span>
              <span className="block text-sm text-gray-600">
                {form.isPublic
                  ? "Signed-in students can find you in People search, see your profile, and follow you."
                  : "Only you can see your profile. You won't appear in People search or on attendee lists, and nobody can follow you. Saving this removes all your current followers, and they won't come back if you go public again."}
              </span>
            </span>
          </label>

          {saveError && (
            <p role="alert" className="text-sm text-red-600">
              {saveError}
            </p>
          )}
          {saved && (
            <p role="status" className="text-sm text-green-700">
              Profile saved.
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="min-h-11 w-full rounded-lg bg-violet-700 px-4 font-semibold text-white disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      )}
    </div>
  );
}
