import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

const allowlist = parseAllowlist(process.env.ADMIN_EMAIL_ALLOWLIST);

// Dev-only mock login so local work doesn't require Google OAuth credentials.
// Never available in production, regardless of env vars set.
const isMockLoginEnabled = process.env.NODE_ENV !== "production";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
    }),
    ...(isMockLoginEnabled
      ? [
          CredentialsProvider({
            id: "mock",
            name: "Mock Login",
            credentials: {
              email: { label: "Email", type: "email" }
            },
            async authorize(credentials) {
              const email = credentials?.email?.trim().toLowerCase();
              if (!email) return null;
              return { id: email, email, name: email.split("@")[0] };
            }
          })
        ]
      : [])
  ],
  pages: {
    signIn: "/sign-in"
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      if (allowlist.size === 0) return false;
      return allowlist.has(user.email.toLowerCase());
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email;
      }
      return session;
    }
  }
};
