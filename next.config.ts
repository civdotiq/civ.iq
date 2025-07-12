import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/unitedstates/images/gh-pages/congress/**',
      },
      {
        protocol: 'https',
        hostname: 'bioguide.congress.gov',
        pathname: '/bioguide/photo/**',
      },
      {
        protocol: 'https',
        hostname: 'www.congress.gov',
        pathname: '/img/member/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/gdelt-api/:path*',
        destination: 'https://api.gdeltproject.org/:path*',
      },
    ];
  },
};

export default nextConfig;