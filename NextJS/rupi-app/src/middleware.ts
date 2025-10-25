import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here if needed
    const { pathname } = req.nextUrl;
    
    // Check if user is trying to access someone else's dashboard
    if (pathname.startsWith('/[') || pathname.includes('/[')) {
      // This is a dynamic route, we'll handle the username check in the page component
      return;
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to auth pages without token
        if (pathname.startsWith('/auth/')) {
          return true;
        }
        
        // Allow access to public pages
        if (pathname === '/' || pathname.startsWith('/_next/') || pathname.startsWith('/api/auth/')) {
          return true;
        }
        
        // Allow access to Telegram webhook and setup endpoints
        if (pathname.startsWith('/api/telegram/')) {
          return true;
        }
        
        // Require token for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
