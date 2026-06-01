// Proxy any /api/backend/* calls to the FastAPI service, but only after
// the user has an authenticated NextAuth session and we inject the admin token.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

const backendBaseUrl = process.env.BACKEND_BASE_URL || "http://localhost:8000";
const adminToken = process.env.ADMIN_API_TOKEN || "";

async function proxy(request: NextRequest) {
  // Gate backend access behind NextAuth to prevent exposing admin APIs to unauthenticated clients.
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const path = request.nextUrl.pathname.replace("/api/backend", "");
  const url = `${backendBaseUrl}${path}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.set("X-Admin-Token", adminToken);
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    return NextResponse.json({ detail: "Backend unavailable" }, { status: 502 });
  }

  if ([204, 205, 304].includes(response.status)) {
    return new NextResponse(null, {
      status: response.status,
      headers: response.headers
    });
  }
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }

  const body = await response.arrayBuffer();
  return new NextResponse(body, {
    status: response.status,
    headers: response.headers
  });
}

export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function POST(request: NextRequest) {
  return proxy(request);
}

export async function PATCH(request: NextRequest) {
  return proxy(request);
}

export async function PUT(request: NextRequest) {
  return proxy(request);
}

export async function DELETE(request: NextRequest) {
  return proxy(request);
}
