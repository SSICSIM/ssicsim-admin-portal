import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
    })
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
