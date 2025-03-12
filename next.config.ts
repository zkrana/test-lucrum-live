import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,  // Disable strict mode to prevent double API calls
  images: {
    domains: ['localhost', 'http://localhost:8000/','https://www.lucrumindustries.com/','https://admin.lucrumindustries.com/'], // Add more domains here
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'admin.lucrumindustries.com',
        pathname: '/public/uploads/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;