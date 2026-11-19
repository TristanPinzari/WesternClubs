// WHAT: The sign-up page ("/sign-up"): creates an Orbit account with Better Auth.
//   Only @uwo.ca emails are allowed. We check that here so students see the error right
//   away, and the server checks it again (server/src/auth.ts) so nobody can skip it.
// WITHOUT IT: Nobody could create an account, so RSVPs, profiles, and following
//   (which all need a signed-in user) would be unusable.
import { EMAIL_DOMAIN_ERROR, isAllowedEmail } from "@orbit/shared";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { authClient } from "../lib/auth-client";

// Better Auth rejects passwords shorter than 8 characters by default.
const MIN_PASSWORD_LENGTH = 8;

export default function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // stop the browser's default full-page form submit

    // Check the easy mistakes before calling the server.
    if (!isAllowedEmail(email)) {
      setError(EMAIL_DOMAIN_ERROR);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      // Better Auth returns { error } for problems the server reports (e.g. the email is
      // already used), but THROWS if the request never reaches the server (no Wi-Fi,
      // server down). On success it also signs the new user in, so there's no second step.
      const { error } = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (error) {
        setError(error.message ?? "Could not create your account.");
        return;
      }
      // New users pick interests and follow clubs first, so their feed isn't empty.
      navigate("/welcome");
    } catch {
      setError(
        "Couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      // Runs on success, on error, AND after a throw, so the button never stays stuck.
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-gray-600">
        Orbit is for Western students. Use your @uwo.ca email.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Western email</span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@uwo.ca"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
          />
          <span className="mt-1 block text-xs text-gray-500">
            At least {MIN_PASSWORD_LENGTH} characters.
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim() || !email || !password}
          className="min-h-11 w-full rounded-lg bg-violet-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/sign-in" className="font-medium text-violet-700 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
