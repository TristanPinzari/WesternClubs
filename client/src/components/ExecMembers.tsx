// WHAT: Exec management follows the permission matrix, with explicit ownership transfer.
// WITHOUT IT: Role changes could be too easy to make by accident. The server must
// independently authorize every request; hiding controls is only a UX safeguard.
import { useCallback, useState, type FormEvent } from "react";
import { isAllowedEmail, type ClubRole } from "@orbit/shared";
import { useResource } from "../hooks/useResource";
import { getMembers, writeMember } from "../lib/clubs";
import { canManageMember } from "../lib/execTypes";
import { buttonClass, inputClass } from "../lib/formUtils";
import { btnDanger } from "../lib/ui";
import Field from "./Field";
import RequestState from "./RequestState";

export default function ExecMembers({
  clubId,
  clubName,
  role,
  actorId,
  onRoleChange,
}: {
  clubId: string;
  clubName: string;
  role: ClubRole;
  actorId: string;
  onRoleChange: () => void;
}) {
  const state = useResource(useCallback(() => getMembers(clubId), [clubId]));
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "editor">("editor");
  const [target, setTarget] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  async function act(
    action: "add" | "role" | "remove" | "transfer",
    userId: string,
    nextRole?: "admin" | "editor",
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await writeMember(clubId, action, userId, nextRole);
      setMessage(
        action === "transfer"
          ? "Ownership transferred. You are now an admin."
          : "Execs updated.",
      );
      setEmail("");
      setTarget("");
      setConfirmation("");
      state.retry();
      // Only re-check access when THIS actor's role changed; don't wipe unsaved club fields after adding a teammate.
      if (action === "transfer" || userId === actorId) onRoleChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update execs.");
    } finally {
      setBusy(false);
    }
  }
  function add(e: FormEvent) {
    e.preventDefault();
    if (!isAllowedEmail(email)) {
      setError("Use the exec's @uwo.ca Orbit email.");
      return;
    }
    void act("add", email.trim().toLowerCase(), newRole);
  }
  return (
    <section className="mt-8 border-t border-gray-200 pt-5">
      <h2 className="text-xl font-semibold">Club execs</h2>
      <RequestState {...state} />
      <RequestState error={error} />
      {message && (
        <p role="status" className="my-3 text-green-800">
          {message}
        </p>
      )}
      <ul className="mt-4 space-y-3">
        {state.data?.map((member) => (
          <li
            key={member.userId}
            className="rounded-lg border border-gray-200 bg-white p-3"
          >
            <p className="wrap-break-word font-semibold">{member.name}</p>
            <p className="wrap-break-word text-sm text-gray-600">
              {member.role}
            </p>
            {canManageMember(role, member.role) && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {role === "owner" && (
                  <label className="text-sm">
                    Role for {member.name}
                    <select
                      value={member.role}
                      disabled={busy || state.loading || state.refreshing}
                      className={inputClass}
                      onChange={(e) => {
                        const value = e.target.value as "admin" | "editor";
                        if (
                          window.confirm(
                            `Change ${member.name}'s role to ${value}?`,
                          )
                        )
                          void act("role", member.userId, value);
                      }}
                    >
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  disabled={busy || state.loading || state.refreshing}
                  className={btnDanger}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove ${member.name} as an exec? They will lose club management access.`,
                      )
                    )
                      void act("remove", member.userId);
                  }}
                >
                  Remove {member.name}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-5 space-y-3">
        <fieldset
          disabled={busy || state.loading || state.refreshing || !state.data}
          className="min-w-0 space-y-3"
        >
          <legend className="font-semibold">Add an exec</legend>
          <Field label="Exec email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="New exec role">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "admin" | "editor")}
              className={inputClass}
            >
              <option value="editor">Editor</option>
              {role === "owner" && <option value="admin">Admin</option>}
            </select>
          </Field>
          <button type="submit" className={buttonClass}>
            Add exec
          </button>
        </fieldset>
      </form>
      {role === "owner" && (
        <form
          className="mt-6 space-y-3 rounded-xl border border-red-200 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              target &&
              confirmation === clubName &&
              window.confirm(
                "Transfer ownership now? You will become an admin and cannot undo this yourself.",
              )
            )
              void act("transfer", target);
          }}
        >
          <h3 className="font-semibold text-red-800">Transfer ownership</h3>
          <p className="text-sm">
            The new owner must already be an exec. You will become an admin and
            lose owner-only permissions.
          </p>
          <Field label="New owner">
            <select
              required
              disabled={busy}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={inputClass}
            >
              <option value="">Choose an existing exec</option>
              {state.data
                ?.filter((member) => member.role !== "owner")
                .map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={`Type ${clubName} to confirm`}>
            <input
              autoComplete="off"
              disabled={busy}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className={inputClass}
            />
          </Field>
          <button
            type="submit"
            disabled={
              busy ||
              state.loading ||
              state.refreshing ||
              !target ||
              confirmation !== clubName
            }
            className="min-h-11 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-40"
          >
            Transfer ownership
          </button>
        </form>
      )}
    </section>
  );
}
