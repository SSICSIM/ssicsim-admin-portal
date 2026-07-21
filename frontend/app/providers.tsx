"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

export function Providers(props: { children: React.ReactNode }) {
  // useState: create a stable QueryClient instance for the app lifecycle.
  const [queryClient] = useState(() => new QueryClient());
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
    </SessionProvider>
  );
}
