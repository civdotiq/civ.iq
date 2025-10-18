/**
 * Next.js configuration optimized for Vercel deployment
 */

// Bundle analyzer configuration
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({
      enabled: true,
      openAnalyzer: true,
    })
  : (config) => config;

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // Enable ESLint in production builds
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
        // Allow internal API photo proxy (development)
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/photo/**',
      },
      {
        // Production API photo proxy (Vercel deployment)
        protocol: 'https',
        hostname: process.env.VERCEL_URL || 'civic-intel-hub.vercel.app',
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
      {
        // Allow all news article images from any source
        // This is necessary because news articles come from various domains
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Production-optimized webpack config
  webpack: (config, { isServer, dev }) => {
    // Development optimizations for WSL2
    if (dev && !isServer) {
      config.watchOptions = {
        poll: false,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
        aggregateTimeout: 300,
      };

      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
    }

    return config;
  },
  // Enable compression for production
  compress: true,
  // Production-ready features
  experimental: {
    scrollRestoration: true,
    // Optimize package imports for better tree-shaking
    optimizePackageImports: ['recharts', 'lucide-react', 'date-fns'],
  },
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=300, stale-while-revalidate=600',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
