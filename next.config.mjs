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
  // Optimized webpack config for WSL2 performance
  webpack: (config, { isServer, dev }) => {
    // Optimize for WSL2 in development
    if (dev && !isServer) {
      config.watchOptions = {
        poll: false, // Disable polling, use native file watching
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
        aggregateTimeout: 300,
      };

      // Reduce memory usage in development
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    return config;
  },
  // Enable experimental features for better performance
  experimental: {
    // Optimize for development
    optimizeCss: false,
    scrollRestoration: true,
  },
};

export default nextConfig;
