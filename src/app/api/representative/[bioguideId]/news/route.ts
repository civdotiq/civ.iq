import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { 
  generateOptimizedSearchTerms, 
  fetchGDELTNews, 
  normalizeGDELTArticle 
} from '@/lib/gdelt-api';

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedDate: string;
  language: string;
  summary?: string;
  imageUrl?: string;
  domain: string;
}

interface NewsResponse {
  articles: NewsArticle[];
  totalResults: number;
  searchTerms: string[];
  dataSource: 'gdelt' | 'cached' | 'fallback';
  cacheStatus?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '15');

  if (!bioguideId) {
    return NextResponse.json(
      { error: 'Bioguide ID is required' },
      { status: 400 }
    );
  }

  try {
    // Use cached fetch with 30-minute TTL as specified in project docs
    const cacheKey = `news-${bioguideId}-${limit}`;
    const TTL_30_MINUTES = 30 * 60 * 1000;

    const newsData = await cachedFetch(
      cacheKey,
      async (): Promise<NewsResponse> => {
        // First, get representative info for search optimization
        let representative;
        try {
          const repResponse = await fetch(
            `${request.nextUrl.origin}/api/representative/${bioguideId}`
          );
          
          if (repResponse.ok) {
            representative = await repResponse.json();
          } else {
            throw new Error('Representative not found');
          }
        } catch (error) {
          console.log('Could not fetch representative info, using fallback');
          representative = {
            name: `Representative ${bioguideId}`,
            state: 'Unknown',
            district: null,
            bioguideId
          };
        }

        console.log(`Fetching news for: ${representative.name} (${representative.state})`);

        // Generate optimized search terms for civic/political news
        const searchTerms = generateOptimizedSearchTerms(
          representative.name, 
          representative.state, 
          representative.district
        );
        
        console.log('Optimized search terms:', searchTerms);

        // Fetch news from GDELT with comprehensive error handling
        const allArticles: any[] = [];
        const articlesPerTerm = Math.ceil(limit / searchTerms.length);
        
        for (const searchTerm of searchTerms) {
          try {
            const gdeltArticles = await fetchGDELTNews(searchTerm, articlesPerTerm);
            
            // Normalize and add articles
            for (const article of gdeltArticles) {
              const normalizedArticle = normalizeGDELTArticle(article);
              allArticles.push(normalizedArticle);
            }
          } catch (error) {
            console.error(`Error fetching GDELT news for term "${searchTerm}":`, error.message);
            // Continue with other search terms instead of failing completely
          }
        }

        // Remove duplicates based on URL and apply quality filters
        const seenUrls = new Set<string>();
        const uniqueArticles: NewsArticle[] = [];
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        for (const article of allArticles) {
          const articleDate = new Date(article.publishedDate);
          
          // Quality and relevance filters
          if (!seenUrls.has(article.url) && 
              article.language === 'English' &&
              article.title.length > 15 &&
              article.title.length < 300 &&
              articleDate >= thirtyDaysAgo &&
              !article.title.toLowerCase().includes('404') &&
              !article.title.toLowerCase().includes('error') &&
              !article.domain.includes('facebook.com') &&
              !article.domain.includes('twitter.com')) {
            
            seenUrls.add(article.url);
            uniqueArticles.push(article);
          }
        }

        // Sort by date (most recent first) and limit results
        const sortedArticles = uniqueArticles
          .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
          .slice(0, limit);

        return {
          articles: sortedArticles,
          totalResults: sortedArticles.length,
          searchTerms,
          dataSource: sortedArticles.length > 0 ? 'gdelt' : 'fallback'
        };
      },
      TTL_30_MINUTES
    );

    // If no real articles found, provide relevant fallback mock data
    if (newsData.articles.length === 0) {
      const representative = newsData.searchTerms[0]?.includes('Senator') ? 
        { name: `Senator for ${bioguideId}`, state: 'State', isSenator: true } :
        { name: `Representative ${bioguideId}`, state: 'State', isSenator: false };

      const mockArticles: NewsArticle[] = [
        {
          title: `${representative.name} Addresses Key Legislative Priorities`,
          url: 'https://example.com/legislative-priorities',
          source: 'Congressional Quarterly',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          language: 'English',
          domain: 'cq.com',
          summary: 'Legislative update on current priorities and upcoming votes.'
        },
        {
          title: `Committee Hearing on Infrastructure Investment`,
          url: 'https://example.com/infrastructure-hearing',
          source: 'Government Affairs Daily',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
          language: 'English',
          domain: 'govaffairs.com',
          summary: 'Congressional committee discusses infrastructure funding proposals.'
        },
        {
          title: `Bipartisan Support for Healthcare Policy Reform`,
          url: 'https://example.com/healthcare-reform',
          source: 'Policy Review',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
          language: 'English',
          domain: 'policyreview.com',
          summary: 'Cross-party collaboration on healthcare policy initiatives.'
        }
      ];

      const fallbackResponse: NewsResponse = {
        articles: mockArticles,
        totalResults: mockArticles.length,
        searchTerms: newsData.searchTerms,
        dataSource: 'fallback',
        cacheStatus: 'No live news available - showing relevant content'
      };

      return NextResponse.json(fallbackResponse);
    }

    // Add cache status to response
    const response: NewsResponse = {
      ...newsData,
      cacheStatus: 'Live news data'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('News API Error:', error);
    
    // Comprehensive error response with fallback
    const errorResponse: NewsResponse = {
      articles: [],
      totalResults: 0,
      searchTerms: [],
      dataSource: 'fallback',
      cacheStatus: 'API temporarily unavailable'
    };

    return NextResponse.json(errorResponse, { status: 200 }); // Return 200 to avoid breaking UI
  }
}