// WHAT: Generic upload control for club logos, event images, and Rokyo's user pictures.
// WITHOUT IT: Each page would duplicate upload validation, progress, and retry handling.
import { useEffect, useId, useRef, useState } from "react";
import { IMAGE_TYPES, uploadImage } from "../lib/uploads";
import type { UploadedImage, UploadFolder } from "../lib/execTypes";

export default function ImageUpload({
  folder,
  label,
  imageUrl,
  disabled = false,
  onChange,
  onBusyChange,
}: {
  folder: UploadFolder;
  label: string;
  imageUrl?: string | null;
  disabled?: boolean;
  onChange: (image: UploadedImage | null) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function select(file?: File) {
    if (!file) return;
    const current = new AbortController();
    controller.current?.abort();
    controller.current = current;
    setError(null);
    setBusy(true);
    onBusyChange?.(true);
    try {
      const image = await uploadImage(file, folder, current.signal);
      if (!current.signal.aborted) onChange(image);
    } catch (err) {
      if (!current.signal.aborted)
        setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      if (!current.signal.aborted) {
        setBusy(false);
        onBusyChange?.(false);
      }
    }
  }
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={`${label} preview`}
          className="h-28 w-28 rounded-lg object-cover"
        />
      )}
      <input
        id={id}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        disabled={disabled || busy}
        aria-describedby={`${id}-hint`}
        className="min-h-11 w-full min-w-0 text-sm"
        onChange={(e) => {
          void select(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <p id={`${id}-hint`} className="text-sm text-gray-600">
        JPEG, PNG, WebP or GIF, up to 5 MB. Retry by choosing the file again.
      </p>
      {busy && <p role="status">Uploading…</p>}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {imageUrl && (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => {
            setError(null);
            onChange(null);
          }}
          className="min-h-11 text-violet-700 underline"
        >
          Remove image
        </button>
      )}
    </div>
  );
}
