import NextAuth, { NextAuthOptions, Account, Profile } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          console.error("Missing credentials");
          throw new Error("Invalid credentials");
        }
      
        try {
          // const apiUrl = process.env.NODE_ENV === 'development'
          //   ? 'https://admin.lucrumindustries.com/api/rest-api/auth/login.php'
          //   : '/api/rest-api/auth/login.php';

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
          let data = await response.text() as any;
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
    async jwt({ token, user }: Record<string, any>): Promise<JWT> {
      console.log("Callback JWT:", {
        user,
        token
      });
      if (user) {
        // console.log("Session JWT User:", user);
        token.accessToken = user?.accessToken;
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.status = user?.status || 'active';
        token.hasDashboardAccess = user?.hasDashboardAccess || false;
      }
      return token;
    },
    async session({ session, token }: Record<string, any>) {
       console.log("Callback session:", {
        session,
        token
       });
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
    async signIn({ user, account, profile }: { user: any, account: Account | null, profile?: Profile }): Promise<boolean> {
      if (account?.provider === 'credentials') {
        console.log('Credentials SignIn Callback Started');
        console.log('User Data:', { email: user?.email, name: user?.name });
        console.log('Account Data:', { provider: account?.provider, type: account?.type });
        return true;
      }

      console.log('Google SignIn Process Started', { 
        userPresent: !!user,
        accountPresent: !!account,
        profilePresent: !!profile
      });

      if (!user || !profile || !account?.access_token) {
        console.error('Missing user, profile, or access_token in Google signIn callback');
        return false;
      }

      console.log('Google SignIn Callback Started');
      console.log('User Data:', { email: user?.email, name: user?.name });
      console.log('Profile Data:', { sub: profile?.sub, email: profile?.email });
      console.log('Account Data:', { 
        provider: account?.provider,
        type: account?.type,
        access_token: account?.access_token ? 'Present' : 'Missing'
      });

      try {
        // const apiUrl = process.env.NODE_ENV === 'development'
        // ? 'https://admin.lucrumindustries.com/api/rest-api/auth/provider_login.php'
        // : '/api/rest-api/auth/login.php';

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
          loginResponseData = loginResponseData ? JSON.parse(loginResponseData) :  await loginResponse?.Body?.json();
        } catch (error) {
          console.error('Failed to read login API response:', error);
        }
        console.log('PHP API Login Response:', {
          status: loginResponse.status,
          statusText: loginResponse.statusText,
          headers: Object.fromEntries(loginResponse.headers.entries()),
          data: loginResponseData
        });
        if (loginResponse.ok) {
          if (!loginResponseData.user || !loginResponseData.token) {
            console.error('Invalid response format from PHP API:', loginResponseData);
            return false;
          } else {
            // Attach the user data and token to the user object
            user.id = loginResponseData.user.id;
            user.accessToken = loginResponseData.token;
            user.status = loginResponseData.user.status || 'active';
            user.hasDashboardAccess = loginResponseData.user.hasDashboardAccess || false;
            user.email = loginResponseData.user.email || user.email; // Ensure email is set from response
            user.name = loginResponseData.user.name || user.name; // Ensure name is set from response
            return user;
          }
        }
      } catch (error) {
        console.error('Failed to read login API response:', error);
        return false;
      }

      try {
        console.log('Attempting to register Google user:', { email: user.email, name: user.name, sub: profile.sub });
        const registerPayload = {
          email: user.email,
          name: user.name,
          googleId: account?.providerAccountId,
          access_token: account?.access_token,
          refresh_token: account?.refresh_token,
          expires_at: account?.expires_at,
          id_token: account?.id_token
        };
        console.log('Sending data to PHP backend:', registerPayload);

        // const apiUrl ='https://admin.lucrumindustries.com/api/rest-api/auth/provider_register.php';
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
        console.log('PHP API Register Response:', {
          status: registerResponse.status,
          statusText: registerResponse.statusText,
          headers: Object.fromEntries(registerResponse.headers.entries()),
          data: responseData
        });

        if (!registerResponse.ok || !responseData.user || !responseData.token) {
          console.error('Invalid response format from PHP API:', responseData);
          return false;
        }

        // Attach the user data and token to the user object
        user.id = responseData.user.id;
        user.accessToken = responseData.token;
        user.status = responseData.user.status || 'active';
        user.hasDashboardAccess = responseData.user.hasDashboardAccess || false;
        user.email = responseData.user.email || user.email; // Ensure email is set from response
        user.name = responseData.user.name || user.name; // Ensure name is set from response
        return user;
      } catch (error) {
        console.error('Failed to read register API response:', error);
        return false;
      }
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };