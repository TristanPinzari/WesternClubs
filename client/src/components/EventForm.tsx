// WHAT: Shared post/edit event fields with cents, dates, and uploaded image keys.
// WITHOUT IT: Execs would need to create events manually in the database.
import {
  EVENT_CATEGORIES,
  createEventSchema,
  type EventCategory,
  type EventDetail,
} from "@orbit/shared";
import { useEffect, useState, type FormEvent } from "react";
import { categoryLabels } from "../lib/eventDisplay";
import {
  buttonClass,
  eventDates,
  inputClass,
  localDateInput,
  optionalHttpUrl,
  priceToCents,
} from "../lib/formUtils";
import type { EventInput } from "../lib/execTypes";
import ImageUpload from "./ImageUpload";
import Field from "./Field";
import RequestState from "./RequestState";

export default function EventForm({
  initial,
  onSave,
  onBusyChange,
}: {
  initial?: EventDetail;
  onSave: (input: EventInput) => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<EventCategory>(
    initial?.category ?? "academic",
  );
  const [start, setStart] = useState(localDateInput(initial?.startsAt ?? null));
  const [end, setEnd] = useState(localDateInput(initial?.endsAt ?? null));
  const [location, setLocation] = useState(initial?.location ?? "");
  const [price, setPrice] = useState(
    ((initial?.priceCents ?? 0) / 100).toFixed(2),
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [eligibility, setEligibility] = useState(initial?.eligibility ?? "");
  const [registrationUrl, setRegistrationUrl] = useState(
    initial?.registrationUrl ?? "",
  );
  const [imageKey, setImageKey] = useState<string | null | undefined>();
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    onBusyChange?.(busy || uploading);
  }, [busy, uploading, onBusyChange]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || uploading) return;
    setBusy(true);
    setError(null);
    try {
      if (!title.trim() || !location.trim())
        throw new Error("Title and location are required.");
      const dates = eventDates(start, end);
      if (!initial && Date.parse(dates.startsAt) <= Date.now())
        throw new Error("New events must start in the future.");
      const input: EventInput = {
        title: title.trim(),
        category,
        ...dates,
        location: location.trim(),
        priceCents: priceToCents(price),
        description: description.trim(),
        eligibility: eligibility.trim(),
        registrationUrl: optionalHttpUrl(registrationUrl),
        ...(imageKey === undefined ? {} : { imageKey }),
      };
      const parsed = createEventSchema.safeParse(input);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      await onSave(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <Field label="Title">
          <input
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
            className={inputClass}
          >
            {EVENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {categoryLabels[value]}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-sm text-gray-600">
          Enter times in your device's time zone (
          {Intl.DateTimeFormat().resolvedOptions().timeZone}). Event listings
          display Ontario time.
        </p>
        <Field label="Start date and time">
          <input
            required
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="End date and time (optional)">
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Location">
          <input
            required
            maxLength={200}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Price in CAD (0 means free)">
          <input
            required
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Description">
          <textarea
            maxLength={5000}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Eligibility">
          <textarea
            maxLength={500}
            rows={3}
            value={eligibility}
            onChange={(e) => setEligibility(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Registration link (optional)">
          <input
            maxLength={2000}
            type="url"
            value={registrationUrl}
            onChange={(e) => setRegistrationUrl(e.target.value)}
            className={inputClass}
          />
        </Field>
        <ImageUpload
          folder="events"
          label="Event image"
          imageUrl={imageUrl}
          onBusyChange={setUploading}
          onChange={(image) => {
            setImageKey(image?.key ?? null);
            setImageUrl(image?.publicUrl ?? null);
          }}
        />
      </fieldset>
      <RequestState error={error} />
      <button
        type="submit"
        disabled={busy || uploading}
        className={buttonClass}
      >
        {busy ? "Saving…" : initial ? "Save event" : "Post event"}
      </button>
    </form>
  );
}
