import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/** Rolling inactivity window; JWT/session maxAge is unchanged in auth config. */
const IDLE_MS = 2 * 60 * 60 * 1000;

const ACTIVITY_COOKIE = "reneset-last-active";

function activityCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 400,
  };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret });
  const res = NextResponse.next();

  if (!token) {
    if (req.cookies.has(ACTIVITY_COOKIE)) {
      res.cookies.delete(ACTIVITY_COOKIE);
    }
    return res;
  }

  const raw = req.cookies.get(ACTIVITY_COOKIE)?.value;
  const now = Date.now();

  if (raw) {
    const lastMs = parseInt(raw, 10);
    if (Number.isFinite(lastMs) && now - lastMs > IDLE_MS) {
      const signOut = new URL("/api/auth/signout", req.url);
      signOut.searchParams.set("callbackUrl", "/login?reason=idle");
      const redirectRes = NextResponse.redirect(signOut);
      redirectRes.cookies.delete(ACTIVITY_COOKIE);
      return redirectRes;
    }
  }

  res.cookies.set(ACTIVITY_COOKIE, String(now), activityCookieOptions());
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
