import NextAuth, { DefaultSession, NextAuthOptions } from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

// 세션 타입 확장
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id?: string;
      role?: string;
      image?: string;
    } & DefaultSession["user"]
  }
}

// JWT 타입 확장
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    picture?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.image = token.picture;
        const dbUser = await User.findOne({ snsId: token.sub });
        session.user.role = dbUser?.role || 'user';
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token;
        // Kakao profile 타입을 명시적으로 지정
        const kakaoProfile = profile as { 
          properties?: { profile_image?: string }
        };
        if (kakaoProfile.properties) {
          token.picture = kakaoProfile.properties.profile_image;
        }
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      try {
        await connectDB();
        
        const kakaoProfile = profile as {
          properties?: { profile_image?: string }
        };
        const profileImage = kakaoProfile.properties?.profile_image;
        
        await User.findOneAndUpdate(
          { name: user.name },
          {
            snsId: user.id,
            image: profileImage
          },
          { upsert: true, new: true }
        );
        
        return true;
      } catch (error) {
        console.error("Error saving user:", error);
        return false;
      }
    },
  },
};

export default NextAuth(authOptions); 