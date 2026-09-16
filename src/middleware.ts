import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Owner-only restricted routes
    const ownerOnlyPaths = [
      "/users",
      "/reports",
      "/products/categories",
      "/inventory/adjust",
      "/settings",
    ];

    const isRestrictedForCashier = ownerOnlyPaths.some(
      (path) => pathname === path || pathname.startsWith(path + "/")
    );

    if (token && token.role === "cashier" && isRestrictedForCashier) {
      // Redirect cashier to POS if attempting to visit owner-only pages
      return NextResponse.redirect(new URL("/pos", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        // Allow public routes
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/_next") ||
          pathname === "/favicon.ico"
        ) {
          return true;
        }
        // Require token for all dashboard routes
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
