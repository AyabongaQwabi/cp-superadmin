import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const session = readSession(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthenticated = !!session;
  const pathname = request.nextUrl.pathname;

  if (pathname === "/login") {
    return isAuthenticated
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const subscriptionEndsAt = session?.subscription.currentPeriodEndsAt
    ? new Date(session.subscription.currentPeriodEndsAt).getTime()
    : 0;
  if (subscriptionEndsAt <= Date.now() && pathname !== "/billing") {
    return NextResponse.redirect(new URL("/billing?expired=1", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
