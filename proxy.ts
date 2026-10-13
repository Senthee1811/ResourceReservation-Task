import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "session";

function getSecret() {
  const secret = process.env.SESSION_SECRET || "change-me-to-a-long-random-string";
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
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

  // Visiting /login: clear stale session cookie if arriving with an error or from parameter, and allow login page to render
  if (pathname === "/login") {
    if (
      request.nextUrl.searchParams.has("from") ||
      request.nextUrl.searchParams.has("error")
    ) {
      const response = NextResponse.next();
      response.cookies.delete(COOKIE_NAME);
      return response;
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
