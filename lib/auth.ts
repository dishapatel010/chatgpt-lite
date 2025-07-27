import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin, apiKey } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { passkey } from "better-auth/plugins/passkey"

 
const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db();
 
export const auth = betterAuth({
  database: mongodbAdapter(db),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      disableSignUp: true,
    },
  },
  plugins: [
    admin(), // Enables admin plugin for user/admin roles
    apiKey(),
    passkey(), // Enables passkey authentication
  ],
});

export type Session = typeof auth.$Infer.Session;
