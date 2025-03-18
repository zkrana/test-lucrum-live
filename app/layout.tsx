import { Manrope } from 'next/font/google';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]/route';
import Providers from './providers';
import RootLayoutClient from './components/layout/RootLayoutClient';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
  preload: true,
  adjustFontFallback: true
});

const publicPaths = ['/', '/terms', '/privacy','/forgot-password','/reset-password'];

export const metadata = {
  title: 'Lucrum Industries',
  description: 'A modern business training and resource platform',
  icons: {
    icon: "https://admin.lucrumindustries.com/public/uploads/favicon.png",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${manrope.variable} font-sans min-h-screen antialiased`}>
        <Providers session={session}>
          <RootLayoutClient publicPaths={publicPaths}>{children}</RootLayoutClient>
        </Providers>
      </body>
    </html>
  );
}
