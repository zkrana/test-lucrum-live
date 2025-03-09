import NextAuth, { NextAuthOptions, Account, Profile } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { Session } from 'next-auth';

interface CustomUser {
  id: string;
  email: string;
  name: string;
  status?: string;
  role?: string;
  hasDashboardAccess?: boolean;
  accessToken?: string;
}

interface CustomSession extends Session {
  user?: CustomUser;
}

const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days to match PHP JWT expiration
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      debug: true,
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("Missing credentials");
          throw new Error("Invalid credentials");
        }
      
        try {
          const apiUrl = process.env.NODE_ENV === 'development'
          ? 'https://admin.lucrumindustries.com/api/rest-api/auth/login.php'
          : '/api/rest-api/auth/login.php';

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          });
          let data = await response.text();
          console.log("API Response:", data);
          data = (data ? JSON.parse(data) : await response.json());
          console.log("API Response:", data);
      
          if (!response.ok) {
            throw new Error(data?.message || data.error || 'Authentication failed');
          }
      
          if (!data.user || !data.token) {
            throw new Error('Invalid response from authentication server');
          }
      
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            status: data.user.status || 'active',
            role: data.user.role || 'user',
            hasDashboardAccess: data.user.hasDashboardAccess || false,
            accessToken: data.token
          };
        } catch (error) {
          console.error('Authentication error:', error);
          throw error;
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT, user: CustomUser | null }): Promise<JWT> {
      if (user) {
        token.accessToken = user?.accessToken;
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.status = user?.status || 'active';
        token.hasDashboardAccess = user?.hasDashboardAccess || false;
      }
      return token;
    },
    async session({ session, token }: { session: CustomSession, token: JWT }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.accessToken = token.accessToken;
        session.user.status = token.status;
        session.user.hasDashboardAccess = token.hasDashboardAccess;
      }
      return session;
    },
    async signIn({ user, account, profile }: { user: { email?: string; name?: string; id?: string; accessToken?: string; status?: string; hasDashboardAccess?: boolean }, account: Account | null, profile?: Profile }): Promise<boolean | CustomUser> {
      if (account?.provider === 'credentials') {
        return true;
      }

      if (!user || !profile || !account?.access_token) {
        console.error('Missing user, profile, or access_token in Google signIn callback');
        return false;
      }

      try {
        const apiUrl = process.env.NODE_ENV === 'development'
        ? 'https://admin.lucrumindustries.com/api/rest-api/auth/provider_login.php'
        : '/api/rest-api/auth/login.php';

        const loginPayload = {
          email: user.email,
          googleId: account?.providerAccountId,
          providerAccountId: account?.providerAccountId,
          access_token: account?.access_token,
          id_token: account?.id_token,
          expires_at: account?.expires_at
        };

        const loginResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(loginPayload)
        });
        let loginResponseData;
        try {
          loginResponseData = await loginResponse.text();
          loginResponseData = loginResponseData ? JSON.parse(loginResponseData) : await loginResponse?.Body?.json();
        } catch (error) {
          console.error('Failed to read login API response:', error);
        }

        if (loginResponse.ok) {
          if (!loginResponseData.user || !loginResponseData.token) {
            console.error('Invalid response format from PHP API:', loginResponseData);
            return false;
          } else {
            user.id = loginResponseData.user.id;
            user.accessToken = loginResponseData.token;
            user.status = loginResponseData.user.status || 'active';
            user.hasDashboardAccess = loginResponseData.user.hasDashboardAccess || false;
            user.email = loginResponseData.user.email || user.email;
            user.name = loginResponseData.user.name || user.name;
            return user;
          }
        }
      } catch (error) {
        console.error('Failed to read login API response:', error);
        return false;
      }

      try {
        const registerPayload = {
          email: user.email,
          name: user.name,
          googleId: account?.providerAccountId,
          access_token: account?.access_token,
          refresh_token: account?.refresh_token,
          expires_at: account?.expires_at,
          id_token: account?.id_token
        };

        const apiUrl ='https://admin.lucrumindustries.com/api/rest-api/auth/provider_register.php';
        const registerResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(registerPayload)
        });

        const responseData = await registerResponse.json();

        if (!registerResponse.ok || !responseData.user || !responseData.token) {
          console.error('Invalid response format from PHP API:', responseData);
          return false;
        }

        user.id = responseData.user.id;
        user.accessToken = responseData.token;
        user.status = responseData.user.status || 'active';
        user.hasDashboardAccess = responseData.user.hasDashboardAccess || false;
        user.email = responseData.user.email || user.email;
        user.name = responseData.user.name || user.name;
        return user;
      } catch (error) {
        console.error('Failed to read register API response:', error);
        return false;
      }
    }
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };
export default handler;