// WHAT: The frontend half of Better Auth: functions for signing up, signing in, signing
//   out, and checking who's signed in. Docs: https://www.better-auth.com/docs/basic-usage
// WITHOUT IT: The sign-up and sign-in pages would have to hand-write the auth API calls
//   and session handling themselves.
// No baseURL needed because the API is on the same domain (/api/auth).
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

// Usage on the sign-up / sign-in pages:
//   await authClient.signUp.email({ name, email, password });
//   await authClient.signIn.email({ email, password });
//   const { data: session } = authClient.useSession();   // inside a component
//   await authClient.signOut();
