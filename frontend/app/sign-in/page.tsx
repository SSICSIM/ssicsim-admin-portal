"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function SignInPage() {
  // Query hooks
  const { data: session } = useSession();
  const router = useRouter();

  // useEffect: redirect authenticated users away from sign-in.
  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [router, session]);

  return (
    <main className="page-shell flex min-h-[80vh] max-w-lg flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-2 rounded-3xl border border-[var(--ssicsim-border)] bg-white p-8 shadow-[var(--ssicsim-shadow)]">
        <h1 className="text-3xl font-bold text-[var(--ssicsim-brand-navy)]">SSICSIM Admin Sign In</h1>
        <p className="text-sm text-[var(--ssicsim-text-muted)]">
          Sign in with an approved Google account to access the admin portal.
        </p>
        <div className="mt-4">
          <Button onClick={() => signIn("google")}>Sign in with Google</Button>
        </div>
      </div>
    </main>
  );
}
