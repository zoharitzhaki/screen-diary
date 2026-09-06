import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "wt_auth";
const PUBLIC_PATHS = ["/login", "/api/login"];

// הגנה בסיסית עם קוד גישה משותף (לא אימות משתמשים אמיתי). אם APP_PASSCODE
// לא מוגדר, האפליקציה פתוחה לגמרי לכל מי שיש לו את הכתובת.
export function proxy(request: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie === passcode) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
