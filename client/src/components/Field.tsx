// WHAT: A labelled field wrapper shared by the mobile-first exec forms.
// WITHOUT IT: Labels and controls could become disconnected for screen readers.
import type { ReactNode } from "react";
export default function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
