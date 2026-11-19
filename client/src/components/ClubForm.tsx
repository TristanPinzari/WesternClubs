// WHAT: Shared create/edit club fields, validated against main's real API contract.
// WITHOUT IT: Unsupported link labels or invalid lengths could be silently dropped.
import { useState, type FormEvent } from "react";
import {
  LINK_KINDS,
  createClubSchema,
  updateClubSchema,
  type LinkKind,
  type Links,
} from "@orbit/shared";
import type { ClubDetails, ClubInput } from "../lib/execTypes";
import { buttonClass, inputClass, optionalHttpUrl } from "../lib/formUtils";
import { linkLabels } from "../lib/profiles";
import Field from "./Field";
import ImageUpload from "./ImageUpload";
import RequestState from "./RequestState";

// Example links, so execs can see what each field expects.
const linkPlaceholders: Record<LinkKind, string> = {
  website: "https://yourclub.ca",
  instagram: "https://instagram.com/yourclub",
  linktree: "https://linktr.ee/yourclub",
  linkedin: "https://linkedin.com/company/yourclub",
  discord: "https://discord.gg/invite-code",
  github: "https://github.com/yourclub",
};

export default function ClubForm({
  initial,
  onSave,
}: {
  initial?: ClubDetails;
  onSave: (input: ClubInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [links, setLinks] = useState<Links>(initial?.links ?? {});
  // undefined preserves the current image; null explicitly removes it.
  const [logoKey, setLogoKey] = useState<string | null | undefined>();
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || uploading) return;
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const basic = createClubSchema.safeParse({ name, description });
      if (!basic.success) throw new Error(basic.error.issues[0].message);
      const cleanLinks: Links = {};
      for (const kind of LINK_KINDS) {
        const url = optionalHttpUrl(links[kind] ?? "");
        if (url) cleanLinks[kind] = url;
      }
      const details = updateClubSchema.safeParse({
        links: cleanLinks,
        ...(logoKey === undefined ? {} : { logoKey }),
      });
      if (!details.success) throw new Error(details.error.issues[0].message);
      await onSave({
        ...basic.data,
        links: cleanLinks,
        ...(logoKey === undefined ? {} : { logoKey }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save club.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <Field label="Club name">
          <input
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Description">
          <textarea
            rows={5}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </Field>
        <ImageUpload
          folder="clubs"
          label="Club logo"
          imageUrl={logoUrl}
          onBusyChange={setUploading}
          onChange={(image) => {
            setLogoKey(image?.key ?? null);
            setLogoUrl(image?.publicUrl ?? null);
          }}
        />
        <fieldset className="min-w-0 space-y-3">
          <legend className="font-semibold">Club links</legend>
          <p className="text-sm text-gray-600">
            Use complete http(s) links. Clear a field to remove that link.
          </p>
          {LINK_KINDS.map((kind) => (
            <Field key={kind} label={`${linkLabels[kind]} URL`}>
              <input
                type="url"
                maxLength={500}
                placeholder={linkPlaceholders[kind]}
                value={links[kind] ?? ""}
                className={inputClass}
                onChange={(e) =>
                  setLinks((current) => ({
                    ...current,
                    [kind]: e.target.value,
                  }))
                }
              />
            </Field>
          ))}
        </fieldset>
      </fieldset>
      <RequestState error={error} />
      {saved && (
        <p role="status" className="text-green-800">
          Club saved.
        </p>
      )}
      <button
        type="submit"
        disabled={busy || uploading}
        className={buttonClass}
      >
        {busy ? "Saving…" : initial ? "Save club" : "Create club"}
      </button>
    </form>
  );
}
