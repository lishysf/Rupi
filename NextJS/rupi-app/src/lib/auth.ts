import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { UserDatabase } from './database';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await UserDatabase.getUserByEmail(credentials.email);
          
          if (!user) {
            return null;
          }

          // Skip password check for OAuth users (marked with OAUTH_USER_NO_PASSWORD)
          if (!user.password_hash || user.password_hash === 'OAUTH_USER_NO_PASSWORD') {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
          
          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign in
      if (account?.provider === 'google' && user.email) {
        try {
          // Check if user exists
          let dbUser = await UserDatabase.getUserByEmail(user.email);
          
          // If user doesn't exist, create a new OAuth user
          if (!dbUser) {
            const name = user.name || (profile as any)?.name || user.email.split('@')[0];
            dbUser = await UserDatabase.createOAuthUser(user.email, name);
          }
          
          // Update user object with database ID
          user.id = dbUser.id.toString();
          user.name = dbUser.name;
          
          return true;
        } catch (error) {
          console.error('Error in Google OAuth sign in:', error);
          return false;
        }
      }
      
      // Allow credentials provider to proceed
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      
      // Fetch onboarding status when we have a user id
      if (token.id) {
        try {
          const idNum = parseInt(token.id as string, 10);
          const dbUser = await UserDatabase.getUserById(idNum);
          (token as any).onboardingCompleted = (dbUser as any)?.onboarding_completed === true;
        } catch (e) {
          // Leave as undefined on error
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).onboardingCompleted = (token as any).onboardingCompleted === true;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle post-login redirect
      // Check if user has completed onboarding
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
