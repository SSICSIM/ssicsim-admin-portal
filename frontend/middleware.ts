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
  const response = authMiddleware(req, event);

  if (response instanceof NextResponse) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|sign-in).*)"]
};
