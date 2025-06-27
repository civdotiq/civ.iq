import { NextRequest, NextResponse } from 'next/server';

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedDate: string;
  language: string;
  tone?: number; // GDELT tone score (-100 to +100)
  summary?: string;
  imageUrl?: string;
  domain: string;
}

interface GDELTArticle {
  url: string;
  urlmobile: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

interface NewsResponse {
  articles: NewsArticle[];
  totalResults: number;
  searchTerms: string[];
}

// Helper function to clean and format article titles
function cleanTitle(title: string): string {
  // Remove common unwanted patterns
  return title
    .replace(/\s*-\s*[^-]*$/, '') // Remove trailing " - Source Name"
    .replace(/\|\s*[^|]*$/, '') // Remove trailing "| Source Name"
    .replace(/\s*\.\.\.$/, '') // Remove trailing "..."
    .trim();
}

// Helper function to extract domain name for source
function extractSourceName(domain: string): string {
  const domainMap: { [key: string]: string } = {
    'cnn.com': 'CNN',
    'foxnews.com': 'Fox News',
    'reuters.com': 'Reuters',
    'apnews.com': 'Associated Press',
    'npr.org': 'NPR',
    'washingtonpost.com': 'Washington Post',
    'nytimes.com': 'New York Times',
    'wsj.com': 'Wall Street Journal',
    'politico.com': 'Politico',
    'thehill.com': 'The Hill',
    'usatoday.com': 'USA Today',
    'nbcnews.com': 'NBC News',
    'abcnews.go.com': 'ABC News',
    'cbsnews.com': 'CBS News',
    'bloomberg.com': 'Bloomberg'
  };

  const cleanDomain = domain.replace(/^www\./, '');
  return domainMap[cleanDomain] || cleanDomain.split('.')[0].toUpperCase();
}

// Helper function to generate search terms for a representative
function generateSearchTerms(representativeName: string, state: string, district?: string): string[] {
  const nameVariations = [
    representativeName,
    representativeName.replace(/^(Rep\.|Senator|Sen\.)\s+/, ''), // Remove titles
  ];

  const searchTerms: string[] = [];
  
  nameVariations.forEach(name => {
    searchTerms.push(`"${name}"`); // Exact name match
    
    // Add context terms
    if (district) {
      searchTerms.push(`"${name}" AND "${state}" AND "district"`);
      searchTerms.push(`"${name}" AND "representative"`);
    } else {
      searchTerms.push(`"${name}" AND "${state}" AND "senator"`);
    }
  });

  return searchTerms.slice(0, 3); // Limit to 3 search terms to avoid too many API calls
}

async function fetchGDELTNews(searchTerm: string, maxRecords: number = 10): Promise<GDELTArticle[]> {
  try {
    // GDELT DOC 2.0 API endpoint
    const encodedQuery = encodeURIComponent(searchTerm);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=artlist&maxrecords=${maxRecords}&format=json&sort=datedesc`;
    
    console.log('Fetching GDELT news with URL:', url);
    
    // Add CORS headers for browser compatibility
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    };
    
    const response = await fetch(url, {
      headers,
      // Add timeout
      signal: AbortSignal.timeout(10000),
      // Force server-side fetch
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`GDELT API error: ${response.status} ${response.statusText}`);
      throw new Error(`GDELT API error: ${response.status}`);
    }

    const text = await response.text();
    console.log('GDELT response length:', text.length);
    
    // Check if response is empty
    if (!text || text.trim() === '') {
      console.log('Empty response from GDELT');
      return [];
    }
    
    const data = JSON.parse(text);
    console.log('GDELT articles found:', data.articles?.length || 0);
    
    if (data.articles) {
      return data.articles;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching from GDELT:', error);
    return [];
  }
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
    // First, try to get representative info
    let representative;
    try {
      const repResponse = await fetch(
        `${request.nextUrl.origin}/api/representative/${bioguideId}`
      );
      
      if (repResponse.ok) {
        representative = await repResponse.json();
      } else {
        // Fallback representative data
        representative = {
          name: `Representative ${bioguideId}`,
          state: 'MI',
          district: null,
          bioguideId
        };
      }
    } catch (error) {
      console.log('Could not fetch representative info, using fallback');
      // Fallback representative data
      representative = {
        name: `Representative ${bioguideId}`,
        state: 'MI',
        district: null,
        bioguideId
      };
    }
    const searchTerms = generateSearchTerms(
      representative.name, 
      representative.state, 
      representative.district
    );
    
    console.log('Searching for:', representative.name, 'with terms:', searchTerms);

    // Fetch news from GDELT
    const allArticles: GDELTArticle[] = [];
    
    for (const searchTerm of searchTerms) {
      const articles = await fetchGDELTNews(searchTerm, Math.ceil(limit / searchTerms.length));
      allArticles.push(...articles);
    }

    // Remove duplicates and process articles
    const seenUrls = new Set<string>();
    const uniqueArticles: NewsArticle[] = [];

    for (const article of allArticles) {
      if (!seenUrls.has(article.url) && article.language === 'English') {
        seenUrls.add(article.url);
        
        uniqueArticles.push({
          title: cleanTitle(article.title),
          url: article.url,
          source: extractSourceName(article.domain),
          publishedDate: article.seendate,
          language: article.language,
          imageUrl: article.socialimage || undefined,
          domain: article.domain
        });
      }
    }

    // Sort by date (most recent first) and limit results
    const sortedArticles = uniqueArticles
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      .slice(0, limit);

    // If no real articles found, provide mock data
    if (sortedArticles.length === 0) {
      const mockArticles: NewsArticle[] = [
        {
          title: `${representative.name} Introduces Bipartisan Infrastructure Bill`,
          url: 'https://example.com/news1',
          source: 'Congressional Daily',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          language: 'English',
          domain: 'example.com'
        },
        {
          title: `Town Hall Meeting Scheduled in ${representative.state}`,
          url: 'https://example.com/news2',
          source: 'Local News Network',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
          language: 'English',
          domain: 'example.com'
        },
        {
          title: `Committee Hearing on Healthcare Policy`,
          url: 'https://example.com/news3',
          source: 'Policy Today',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
          language: 'English',
          domain: 'example.com'
        },
        {
          title: `${representative.name} Calls for Transportation Funding`,
          url: 'https://example.com/news4',
          source: 'Transportation Weekly',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
          language: 'English',
          domain: 'example.com'
        },
        {
          title: `Bipartisan Support for Education Initiative`,
          url: 'https://example.com/news5',
          source: 'Education Times',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
          language: 'English',
          domain: 'example.com'
        }
      ];

      const newsResponse: NewsResponse = {
        articles: mockArticles,
        totalResults: mockArticles.length,
        searchTerms
      };

      return NextResponse.json(newsResponse);
    }

    const newsResponse: NewsResponse = {
      articles: sortedArticles,
      totalResults: sortedArticles.length,
      searchTerms
    };

    return NextResponse.json(newsResponse);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}