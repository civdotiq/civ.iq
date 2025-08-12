/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // ESLint violations reduced from 668 to 615 - more fixes needed before enabling
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignoring TypeScript errors - 679 errors need to be addressed
    ignoreBuildErrors: true,
  },
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
  // Simplified webpack configuration for better development experience
  webpack: (config, { isServer, dev }) => {
    // Handle server-only dependencies on client side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      // Exclude server-only dependencies from client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        '@opentelemetry/api': false,
        '@opentelemetry/auto-instrumentations-node': false,
        '@opentelemetry/instrumentation-fs': false,
        '@opentelemetry/instrumentation-http': false,
        '@redis/client': false,
        ioredis: false,
        redis: false,
        winston: false,
      };
    }

    // Only apply complex splitting in production
    if (!dev) {
      // Let Next.js handle default optimization for production
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }

    return config;
  },
  // Simplified experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', 'clsx', 'tailwind-merge'],
  },
  async headers() {
    // Define secure CORS origins based on environment
    const allowedOrigins =
      process.env.NODE_ENV === 'production'
        ? ['https://civic-intel-hub.vercel.app', 'https://civiq.app', 'https://www.civiq.app']
        : [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
          ];

    // Add custom origins from environment variable
    const customOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
    const allAllowedOrigins = [...allowedOrigins, ...customOrigins];

    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: allAllowedOrigins.join(', '),
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
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
