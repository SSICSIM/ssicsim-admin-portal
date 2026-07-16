"use client";

import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const isMockLoginEnabled = process.env.NODE_ENV !== "production";

export default function SignInPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mockEmail, setMockEmail] = useState("");
  const [mockError, setMockError] = useState<string | null>(null);
  const [mockLoading, setMockLoading] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [router, session]);

  async function handleMockSignIn(e: React.FormEvent) {
    e.preventDefault();
    setMockError(null);
    setMockLoading(true);
    const result = await signIn("mock", {
      email: mockEmail,
      redirect: false
    });
    setMockLoading(false);
    if (result?.error) {
      setMockError("That email isn't on the allowlist.");
      return;
    }
    router.replace("/");
  }

  return (
    <main className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Card: navy hero + white form */}
        <div className="overflow-hidden rounded-2xl border border-[var(--ssicsim-border)] shadow-[0_8px_40px_rgba(0,0,0,0.1)]">

          {/* Navy top panel with WhiteLogo */}
          <div className="relative flex flex-col items-center gap-3 bg-[var(--ssicsim-brand-navy)] px-8 py-10">
            {/* Subtle radial glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(184,146,42,0.15),transparent_70%)]" />
            <Image
              src="/branding/WhiteLogo.png"
              alt="SSICSIM"
              width={220}
              height={52}
              unoptimized
              className="relative h-12 w-auto object-contain"
              priority
            />
          </div>

          {/* White form panel */}
          <div className="bg-white px-8 py-7">
            <div className="space-y-1 text-center">
              <h2 className="text-lg font-bold text-[var(--ssicsim-brand-navy)] [font-family:var(--font-heading)]">
                Welcome back
              </h2>
              <p className="text-sm text-[var(--ssicsim-text-muted)] leading-relaxed">
                Sign in with an approved Google account to continue.
              </p>
            </div>

            <div className="mt-6">
              <Button className="w-full" size="lg" onClick={() => signIn("google")}>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </Button>
            </div>

            {isMockLoginEnabled && (
              <>
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--ssicsim-border)]" />
                  <span className="text-xs uppercase tracking-wide text-[var(--ssicsim-text-muted)]">
                    Dev only
                  </span>
                  <div className="h-px flex-1 bg-[var(--ssicsim-border)]" />
                </div>

                <form className="space-y-2" onSubmit={handleMockSignIn}>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={mockEmail}
                    onChange={(e) => setMockEmail(e.target.value)}
                    required
                  />
                  {mockError && (
                    <p className="text-xs text-red-600">{mockError}</p>
                  )}
                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full"
                    size="lg"
                    disabled={mockLoading}
                  >
                    {mockLoading ? "Signing in..." : "Mock sign in"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
