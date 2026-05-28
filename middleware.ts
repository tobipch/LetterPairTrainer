import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  const isAuth = !!session.userId;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isResetPage = req.nextUrl.pathname === "/reset-password";
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");
  const isApi = req.nextUrl.pathname.startsWith("/api");

  if (!isAuth && !isLoginPage && !isResetPage && !isApiAuth) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuth && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
