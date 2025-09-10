/**
 * Next.js configuration optimized for WSL2 environment
 */

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
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
        // Congress.gov member images
        protocol: 'https',
        hostname: 'www.congress.gov',
        port: '',
        pathname: '/img/**',
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
      {
        // GitHub raw content for representative images
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/unitedstates/images/**',
      },
    ],
  },
  // WSL2 optimizations - simplified to fix vendor.js issue
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
  // Temporarily disable experimental features to fix build
  // experimental: {
  //   // Reduce memory usage
  //   workerThreads: false,
  //   cpus: 2,
  // },
};

export default nextConfig;
