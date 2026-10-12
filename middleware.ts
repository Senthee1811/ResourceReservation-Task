import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "session";

function getSecret() {
  const secret = process.env.SESSION_SECRET || "change-me-to-a-long-random-string";
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let session: { sub: string; role: "ADMIN" | "MEMBER"; name: string } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret(), {
        algorithms: ["HS256"],
      });
      session = {
        sub: payload.sub as string,
        role: payload.role as "ADMIN" | "MEMBER",
        name: payload.name as string,
      };
    } catch {
      session = null;
    }
  }

  // Root redirect
  if (pathname === "/") {
    const target = session ? "/resources" : "/login";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Already logged in visiting /login
  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/resources", request.url));
    }
    return NextResponse.next();
  }

  // Protected paths
  const isProtected =
    pathname.startsWith("/resources") ||
    pathname.startsWith("/reservations") ||
    pathname.startsWith("/admin");

  if (isProtected) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
      const forbiddenUrl = new URL("/resources", request.url);
      forbiddenUrl.searchParams.set("error", "forbidden");
      return NextResponse.redirect(forbiddenUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
