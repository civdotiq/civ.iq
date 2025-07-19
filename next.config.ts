/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

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
  // Configure webpack to handle dynamic imports and Leaflet properly
  webpack: (config, { isServer, dev }) => {
    // Handle Leaflet on the client side only
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Strip console statements in production
    if (!dev) {
      config.optimization.minimize = true;
      config.optimization.usedExports = true;
      
      // Remove console statements in production
      if (config.optimization.minimizer) {
        const TerserPlugin = require('terser-webpack-plugin');
        config.optimization.minimizer.push(
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true,
                drop_debugger: true,
              },
            },
          })
        );
      }
    }
    
    return config;
  },
  // Enable experimental features for better dynamic imports
  experimental: {
    optimizePackageImports: ['leaflet', 'react-leaflet'],
  },
  async headers() {
    // Define secure CORS origins based on environment
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          'https://civic-intel-hub.vercel.app',
          'https://civiq.app',
          'https://www.civiq.app'
        ]
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001'
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