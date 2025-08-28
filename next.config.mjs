/**
 * Next.js configuration optimized for WSL2 environment
 */

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bioguide.congress.gov',
        port: '',
        pathname: '/bioguide/photo/**',
      },
      {
        // Allow internal API photo proxy
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/photo/**',
      },
      {
        // Allow production API photo proxy
        protocol: 'https',
        hostname: 'civ.iq',
        port: '',
        pathname: '/api/photo/**',
      },
    ],
  },
  // WSL2 optimizations
  webpack: (config, { isServer }) => {
    // Disable file system polling in WSL2
    if (!isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  // Experimental features for better WSL2 performance
  experimental: {
    // Reduce memory usage
    workerThreads: false,
    cpus: 2,
  },
};

export default nextConfig;
