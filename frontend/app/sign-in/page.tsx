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
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">SSICSIM Admin Sign In</h1>
        <p className="text-sm text-white/70">
          Sign in with an approved Google account to access the admin portal.
        </p>
      </div>
      <Button onClick={() => signIn("google")}>Sign in with Google</Button>
    </main>
  );
}
