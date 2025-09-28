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
        // Production API photo proxy (update with your domain)
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '') || 'your-app.vercel.app',
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
  // Production-ready features
  experimental: {
    scrollRestoration: true,
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
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
