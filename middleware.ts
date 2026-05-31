export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Protect everything except:
     * - /login
     * - /api/auth (NextAuth)
     * - next internals and static files
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
