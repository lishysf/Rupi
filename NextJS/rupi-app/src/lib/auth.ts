import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { UserDatabase } from './database';

export const authOptions: NextAuthOptions = {
  providers: [
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
    async jwt({ token, user }) {
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
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
