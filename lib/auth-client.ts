import { createAuthClient } from "better-auth/react";
import { adminClient, apiKeyClient, passkeyClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [
    adminClient(),
    apiKeyClient(),
    passkeyClient(),  // Enables passkey client plugin
  ],
});

export type Session = typeof authClient.$Infer.Session;
