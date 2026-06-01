import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent } from "next/server";

const authMiddleware = withAuth({
  pages: {
    signIn: "/sign-in"
  }
});

export default function middleware(
  req: NextRequestWithAuth,
  event: NextFetchEvent
) {
  // authMiddleware returns a NextResponse (redirect) when unauthenticated,
  // or void when it passes through. In both cases we must set X-Robots-Tag.
  const authResponse = authMiddleware(req, event);
  const response = authResponse instanceof NextResponse
    ? authResponse
    : NextResponse.next();

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|sign-in|branding).*)"]
};
