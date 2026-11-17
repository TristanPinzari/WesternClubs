// WHAT: The sign-in page ("/sign-in"): signs an existing user in with Better Auth.
//   Better Auth sets a session cookie, and every later /api request sends it
//   automatically, which is how the server knows who you are (req.user).
// WITHOUT IT: Returning students would have no way back into their account.
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { authClient } from "../lib/auth-client";

export default function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await authClient.signIn.email({
      email: email.trim(),
      password,
    });
    setSubmitting(false);

    if (error) {
      // Better Auth deliberately says "Invalid email or password" for both a wrong
      // email and a wrong password, so attackers can't find out which emails exist.
      setError(error.message ?? "Could not sign you in.");
      return;
    }
    navigate("/");
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mt-1 text-gray-600">Welcome back to Orbit.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !email || !password}
          className="min-h-11 w-full rounded-lg bg-violet-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        New to Orbit?{" "}
        <Link to="/sign-up" className="font-medium text-violet-700 underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
