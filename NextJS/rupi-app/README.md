This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Note**: 
- For production, update `NEXTAUTH_URL` to your production domain
- **IMPORTANT**: If your domain uses `www`, set `NEXTAUTH_URL=https://www.fundy.id` (with www)
- The `NEXTAUTH_URL` must match exactly what Google Cloud Console sees (including www or no www)

#### Setting up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google Identity API)
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application" as the application type
6. Configure the OAuth consent screen if prompted
7. Add **Authorized JavaScript origins** (base URLs only, no trailing slashes):
   - For development: `http://localhost:3000`
   - For production: `https://yourdomain.com`
8. Add **Authorized redirect URIs** (exact callback URLs):
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: **ADD BOTH** (if your domain uses www):
     - `https://www.fundy.id/api/auth/callback/google` (with www)
     - `https://fundy.id/api/auth/callback/google` (without www)
   - **Important**: 
     - No trailing slashes, exact path match required
     - If your domain redirects www to non-www (or vice versa), add BOTH versions
     - This is the ONLY redirect URI pattern you need - NextAuth handles all redirects internally
     - The `/auth/telegram-oauth` page is handled by NextAuth's redirect callback, not as a separate redirect URI
   - **Common Issue**: If you see `redirect_uri=https://www.fundy.id/api/auth/callback/google` in the error, make sure you have the www version in Google Cloud Console
9. Copy the Client ID and Client Secret to your `.env.local` file

**Note**: Make sure there are no trailing slashes in the URIs and that the paths match exactly.

### Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
