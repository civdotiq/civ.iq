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
  typescript: {
    ignoreBuildErrors: false,
  },
  // Next.js 16 uses Turbopack by default - silence webpack migration warning
  turbopack: {},
  // Remove console logs in production for better performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] } // Keep error and warn for debugging
      : false,
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
      // News article images - explicitly allowlisted domains
      // SECURITY: Avoid wildcard '**' to prevent image-based attacks
      {
        protocol: 'https',
        hostname: '*.reuters.com',
      },
      {
        protocol: 'https',
        hostname: '*.apnews.com',
      },
      {
        protocol: 'https',
        hostname: '*.nytimes.com',
      },
      {
        protocol: 'https',
        hostname: '*.washingtonpost.com',
      },
      {
        protocol: 'https',
        hostname: '*.politico.com',
      },
      {
        protocol: 'https',
        hostname: '*.cnn.com',
      },
      {
        protocol: 'https',
        hostname: '*.foxnews.com',
      },
      {
        protocol: 'https',
        hostname: '*.nbcnews.com',
      },
      {
        protocol: 'https',
        hostname: '*.cbsnews.com',
      },
      {
        protocol: 'https',
        hostname: '*.abcnews.go.com',
      },
      {
        protocol: 'https',
        hostname: '*.npr.org',
      },
      {
        protocol: 'https',
        hostname: '*.bbc.com',
      },
      {
        protocol: 'https',
        hostname: '*.thehill.com',
      },
      {
        protocol: 'https',
        hostname: '*.axios.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        // Wikipedia/Wikimedia for biographical images
        protocol: 'https',
        hostname: '*.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: '*.wikipedia.org',
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
    optimizePackageImports: ['d3', 'recharts', 'lucide-react', 'date-fns'],
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
