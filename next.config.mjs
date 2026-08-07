/**
 * Next.js configuration optimized for Vercel deployment
 */

// NOTE ON BUNDLE ANALYSIS (2026-07-26)
//
// This file previously wrapped the config in `@next/bundle-analyzer` via a
// bare `require()`. Three things were wrong with that and all three were
// verified:
//
//   1. This is an ES module — `require` is not defined, so the call threw.
//   2. The package was not installed at all.
//   3. Even installed, it does not work here: the analyzer is incompatible
//      with Turbopack ("The Next Bundle Analyzer is not compatible with
//      Turbopack builds, no report will be generated"), and this project
//      builds with Turbopack. Forcing `next build --webpack` instead OOMs,
//      at both the default heap and 8 GB. `next experimental-analyze` (the
//      Turbopack-native path Next suggests) produced no output in 11 minutes.
//
// So the wrapper is gone rather than left as decoration. Use
// `npm run perf:analyze`, which measures the real Turbopack client output.
// If you want the interactive treemap, `next experimental-analyze` is the
// upstream direction — it just could not be verified on this machine.

const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  // Prevent source code exposure in production
  productionBrowserSourceMaps: false,
  // Next.js 16 uses Turbopack by default
  turbopack: {},
  // Force-ship the ONNX model + metadata AND the onnxruntime-web WASM runtime
  // with intelligence routes. Without this, `require('onnxruntime-web')` inside
  // vote-predictor.ts is a runtime lookup the tracer may miss, causing a
  // MODULE_NOT_FOUND on Vercel's read-only fs → 500 on /vote-prediction.
  outputFileTracingIncludes: {
    '/api/intelligence/**': [
      './models/**/*',
      './node_modules/onnxruntime-web/**/*',
    ],
    // The LDA corpus status route and the health freshness canary read this
    // sidecar at runtime; the tracer won't infer the fs read, so ship it with
    // those functions explicitly.
    '/api/lda/**': ['./data/lda-aggregates.meta.json', './data/lda-filings.meta.json'],
    '/api/health': ['./data/lda-aggregates.meta.json'],
    // The rep lobbying route reads the full corpus for per-committee totals.
    '/api/representative/[bioguideId]/lobbying': ['./data/lda-aggregates.json'],
    // The industry organizations route reads it for per-sector issue totals.
    '/api/industry/[sector]/organizations': ['./data/lda-aggregates.json'],
    // The committee ask-page reads it for corpus-backed committee totals.
    '/ask/[slug]/[entityId]': ['./data/lda-aggregates.json'],
    // The committee intelligence route's analyzer ranks peers off the corpus.
    '/api/intelligence/committee/[committeeId]': ['./data/lda-aggregates.json'],
    // The influence-chain analyzer reads filing-level rows, not aggregates —
    // it needs the organizations behind a committee's spending, not its total.
    '/api/intelligence/representative/[bioguideId]/influence-chain': [
      './data/lda-filings.json.br',
    ],
    // Address-lookup routes read the CD120 (2026 ballot) district polygons
    // for local point-in-polygon; the tracer won't infer the fs read.
    '/api/geocode': ['./data/cd120-districts.json.br'],
    '/api/unified-geocode': ['./data/cd120-districts.json.br'],
    '/api/intelligence/address/representatives': ['./data/cd120-districts.json.br'],
  },
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
  experimental: {
    scrollRestoration: true,
    // Optimize package imports for better tree-shaking.
    //
    // Must name the packages actually imported. Previously this listed
    // `date-fns` (not a dependency at all) and `d3` (only ever imported as a
    // type — the real value imports are the d3-* submodules below), while
    // omitting @heroicons/react, the largest icon package in the tree.
    optimizePackageImports: [
      'recharts',
      'lucide-react',
      '@heroicons/react',
      'd3-selection',
      'd3-scale',
      'd3-force',
      'd3-axis',
      'd3-shape',
      'd3-array',
      'd3-drag',
      'd3-zoom',
      'd3-interpolate',
    ],
  },
  // Redirects for deprecated routes
  async redirects() {
    return [
      {
        source: '/money-report',
        destination: '/your-reps',
        permanent: true,
      },
    ];
  },
  // Rewrites for clean URL aliases
  async rewrites() {
    return [
      {
        source: '/lite/:path*',
        destination: '/:path*?lite=1',
      },
    ];
  },
  // Headers for security and performance
  async headers() {
    return [
      // Never-cache surface: user-token endpoints (alerts/digest manage,
      // verify, unsubscribe), admin and debug routes, cron and cache
      // infrastructure. These set no Cache-Control of their own, so without
      // this rule they fall to the blanket API default below and are stored
      // by the CDN. Measured 2026-07-26: /api/cache/status was
      // `x-vercel-cache: HIT` at age 17 and `STALE` at age 348 in production
      // — i.e. really cached for the blanket 300s. A shared cache holding a
      // subscriber's state, or making a state-changing GET look idempotent,
      // is the wrong default for all of these.
      //
      // This is carved OUT of the blanket rule below (negative lookahead)
      // rather than layered on top of it, so exactly one header rule matches
      // any given path and there is no precedence question to reason about.
      {
        source:
          '/api/:path(alerts/.*|digest/.*|admin/.*|debug|debug/.*|agent|cache/.*|cron/.*|warmup|health/redis)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      {
        source:
          '/api/:path((?!alerts/|digest/|admin/|debug|agent|cache/|cron/|warmup|health/redis).*)',
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

export default nextConfig;
