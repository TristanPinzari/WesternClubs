// WHAT: Direct-to-storage upload. Never send our login cookie to the storage host.
// WITHOUT IT: Images would be sent through Express or saved before uploading succeeds.
import { apiWrite } from "./api";
import {
  IMAGE_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  uploadRequestSchema,
  type UploadResponse,
} from "@orbit/shared";
import { useMockExec } from "./demoMode";
import type { UploadedImage, UploadFolder } from "./execTypes";

export const IMAGE_TYPES = IMAGE_CONTENT_TYPES;
export function validateImage(file: Pick<File, "size" | "type">) {
  if (!IMAGE_TYPES.some((type) => type === file.type))
    throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
  // Match main's signed upload size limit; SVG is deliberately excluded on both sides.
  if (!file.size || file.size > MAX_UPLOAD_BYTES)
    throw new Error("Choose an image between 1 byte and 5 MB.");
}
export async function uploadImage(
  file: File,
  folder: UploadFolder,
  signal: AbortSignal,
): Promise<UploadedImage> {
  validateImage(file);
  if (useMockExec) {
    const publicUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      const abort = () => reader.abort();
      signal.addEventListener("abort", abort, { once: true });
      reader.onloadend = () => signal.removeEventListener("abort", abort);
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read image."));
      reader.onabort = () =>
        reject(new DOMException("Cancelled", "AbortError"));
      reader.readAsDataURL(file);
    });
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const key = `${folder}/${crypto.randomUUID()}.${extensions[file.type]}`;
    (await import("../data/mockExec")).rememberDemoImage(key, publicUrl);
    return { key, publicUrl };
  }
  const ticket = await apiWrite<UploadResponse>(
    "/uploads",
    "POST",
    uploadRequestSchema.parse({
      folder,
      contentType: file.type,
      size: file.size,
    }),
    signal,
  );
  if (
    !ticket.key.startsWith(`${folder}/`) ||
    new URL(ticket.uploadUrl).protocol !== "https:" ||
    new URL(ticket.publicUrl).protocol !== "https:"
  )
    throw new Error(
      "The upload service returned an invalid image destination.",
    );
  const response = await fetch(ticket.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
    credentials: "omit",
    signal,
  });
  if (!response.ok)
    throw new Error(`Image upload failed (${response.status}). Try again.`);
  return { key: ticket.key, publicUrl: ticket.publicUrl };
}
