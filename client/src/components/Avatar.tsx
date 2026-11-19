// WHAT: A round profile picture, or the person's first initial when they have none.
//   Used in the header, on attendee lists, and on profile pages.
// WITHOUT IT: Each of those places would draw avatars slightly differently.
import { initialOf } from "../lib/ui";

const sizes = {
  sm: "h-7 w-7 text-xs",
  md: "h-10 w-10 text-base",
  lg: "h-20 w-20 text-3xl",
};

export default function Avatar({
  name,
  image,
  size = "md",
}: {
  name: string;
  image: string | null | undefined;
  size?: keyof typeof sizes;
}) {
  // alt="" because the name is always shown right next to the avatar; screen readers
  // would otherwise read it twice.
  if (image) {
    return (
      <img
        src={image}
        alt=""
        className={`${sizes[size]} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-violet-100 font-semibold text-violet-800`}
    >
      {initialOf(name)}
    </span>
  );
}
