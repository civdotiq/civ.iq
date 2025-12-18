import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/', // Don't crawl API endpoints
          '/_next/', // Next.js internals
          '/admin/', // Admin pages if any
        ],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: '/photos/', // Allow image bot to crawl photos
      },
    ],
    sitemap: ['https://civdotiq.org/sitemap.xml', 'https://civdotiq.org/sitemap-images.xml'],
  };
}
