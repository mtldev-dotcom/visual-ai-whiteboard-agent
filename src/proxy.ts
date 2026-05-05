import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth", "/api/health"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (isPublic) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin UI routes: non-admins get redirected to /core
  // API admin routes enforce ADMIN role themselves via requireAdmin()
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/api/admin") &&
    token.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/core", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
