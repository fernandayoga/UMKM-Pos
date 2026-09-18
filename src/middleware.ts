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
        // Allow public routes and static assets
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/_next") ||
          pathname === "/favicon.ico" ||
          pathname === "/logo.png" ||
          /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname)
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
     * - favicon.ico, logo.png & image assets
     * - login
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|logo.png|placeholder.png|placeholder.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|login).*)",
  ],
};
