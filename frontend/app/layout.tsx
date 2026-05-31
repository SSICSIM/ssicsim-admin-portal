import type { Metadata } from "next";

import "./globals.css";
import { Providers } from "./providers";
import { NavbarWrapper } from "@/components/NavbarWrapper";

export const metadata: Metadata = {
  title: "SSICSIM Admin Portal",
  description: "Administrative dashboard for SSICSIM conference operations."
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <NavbarWrapper />
          {props.children}
        </Providers>
      </body>
    </html>
  );
}
