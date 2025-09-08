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
  // WSL2 optimizations & Bundle optimization
  webpack: (config, { isServer }) => {
    // Disable file system polling in WSL2
    if (!isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    // Bundle optimization for performance
    config.optimization = {
      ...config.optimization,
      // Split vendor chunks more aggressively
      splitChunks: {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          // Heavy visualization libraries
          charts: {
            test: /[\\/]node_modules[\\/](recharts|d3|d3-.*)[\\/]/,
            name: 'charts',
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Mapping libraries
          maps: {
            test: /[\\/]node_modules[\\/](leaflet|react-leaflet|maplibre-gl|@mapbox)[\\/]/,
            name: 'maps',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true,
          },
          // React ecosystem
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-window)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Large utility libraries
          utils: {
            test: /[\\/]node_modules[\\/](swr|zustand|fuse\.js|html2canvas)[\\/]/,
            name: 'utils',
            chunks: 'all',
            priority: 15,
            reuseExistingChunk: true,
          },
          // Default vendor chunk for remaining dependencies
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      },
    };

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
