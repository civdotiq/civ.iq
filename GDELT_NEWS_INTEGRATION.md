# GDELT News Integration - Technical Documentation

## Overview

The GDELT (Global Database of Events, Language, and Tone) news integration provides real-time news coverage for all members of Congress on their profile pages. This system was fixed and enhanced on August 1, 2025, to provide reliable, live news feeds.

## Architecture

### Core Components

1. **GDELT V2 DOC API Client** (`src/features/news/services/gdelt-api.ts`)
   - Rate-limited HTTP client (30 calls/minute)
   - Retry logic with exponential backoff
   - Comprehensive error handling
   - TypeScript-safe implementations

2. **Smart Search Strategy**
   - Dynamic search term generation based on member role
   - Progressive specificity (broad to narrow)
   - Senator vs. Representative optimized queries

3. **News Processing Pipeline**
   - Advanced deduplication across multiple search terms
   - Quality filtering (English only, legitimate sources)
   - Article clustering and categorization
   - Date normalization and sorting

4. **Caching Layer**
   - 30-minute TTL for API responses
   - Intelligent cache invalidation
   - Background refresh capabilities

## API Endpoint

### GET `/api/representative/[bioguideId]/news`

**Parameters:**

- `bioguideId` (required): Congressional bioguide identifier
- `limit` (optional): Number of articles (default: 15)
- `enhanced` (optional): Use advanced query builder (default: false)

**Response Format:**

```json
{
  "articles": [
    {
      "title": "Article headline",
      "url": "https://source.com/article",
      "source": "Source Name",
      "publishedDate": "2025-08-01T12:00:00.000Z",
      "language": "English",
      "domain": "source.com",
      "imageUrl": "https://source.com/image.jpg"
    }
  ],
  "totalResults": 4,
  "searchTerms": [
    "\"Ron Johnson\"",
    "\"Senator Ron Johnson\" OR \"Sen. Ron Johnson\"",
    "\"Ron Johnson\" AND \"WI\"",
    "\"Ron Johnson\" AND Senate"
  ],
  "dataSource": "gdelt",
  "cacheStatus": "Live news data"
}
```

## Search Strategy

### For Senators

1. `"[Full Name]"` - Broad name search
2. `"Senator [Full Name]" OR "Sen. [Full Name]"` - Title-specific
3. `"[Full Name]" AND "[State]"` - Geographic context
4. `"[Full Name]" AND Senate` - Chamber context

### For Representatives

1. `"[Full Name]"` - Broad name search
2. `"[Full Name]" AND "[State]"` - Geographic context
3. `"Representative [Full Name]" OR "Rep. [Full Name]"` - Title-specific
4. `"[Full Name]" AND (Congress OR House)` - Chamber context

## GDELT API Integration

### Query Parameters

- **API Endpoint**: `https://api.gdeltproject.org/api/v2/doc/doc`
- **Mode**: `artlist` (article list format)
- **Format**: `json`
- **Timespan**: `7days` (configurable)
- **Content Type**: `NEWS`
- **Deduplication**: `true`
- **Sort**: `socialimage` (prioritize articles with images)

### Political Themes Filter

The system filters for political content using these GDELT themes:

- `GENERAL_GOVERNMENT`
- `POLITICAL_PROCESS`
- `POLITICAL_CANDIDATE`
- `ELECTORAL_POLITICS`
- `POLITICAL_ISSUES`
- `GOVERNMENT_TRANSPARENCY`
- `POLITICAL_CORRUPTION`
- `CONGRESSIONAL_POLITICS`
- `GOVERNMENT_LEGISLATION`
- `POLITICAL_COMMUNICATIONS`

## Quality Assurance

### Article Filtering

- **Language**: English only
- **Title Length**: 15-300 characters
- **Date Range**: Within 30 days
- **Source Quality**: Excludes social media domains
- **Content Quality**: Filters out error pages and invalid titles

### Deduplication Strategy

1. **URL-based**: Remove exact URL duplicates
2. **Title Similarity**: 85% threshold using string comparison
3. **Domain Clustering**: Max 2 articles per domain
4. **Cross-term Deduplication**: Final pass across all search results

## Performance Optimizations

### Rate Limiting

- 30 API calls per minute to respect GDELT limits
- Automatic retry with backoff on rate limit hits
- Request queuing for burst protection

### Caching Strategy

- **TTL**: 30 minutes for news data
- **Cache Key**: `news-${bioguideId}-${limit}`
- **Background Refresh**: Page Visibility API integration
- **Intelligent Invalidation**: Based on content freshness

### Error Handling

- **Graceful Degradation**: Falls back to cached data
- **Timeout Protection**: 15-second request timeout
- **Circuit Breaker**: Prevents cascade failures
- **Comprehensive Logging**: Structured logging for debugging

## UI Integration

### News Tab Component (`src/features/news/components/EnhancedNewsFeed.tsx`)

- **Auto-refresh**: 5-minute intervals when page visible
- **Filtering Controls**: Source and timeframe filters
- **Real-time Status**: Shows data source and freshness
- **Responsive Design**: Mobile-optimized article cards
- **Image Optimization**: Lazy loading with error handling

### Member Profile Integration

- **Tab System**: Integrated into member profile tabs
- **Loading States**: Skeleton components during fetch
- **Error Boundaries**: Graceful error handling
- **Performance**: Lazy-loaded component splitting

## Testing and Verification

### Test Cases Verified

1. **Ron Johnson (J000293)**: Wisconsin Senator
   - ✅ Returns 4+ real news articles
   - ✅ Proper search terms generated
   - ✅ Live GDELT data source
   - ✅ Articles from legitimate news sources

2. **API Performance**
   - ✅ Sub-15 second response times
   - ✅ Proper caching behavior
   - ✅ Rate limiting compliance
   - ✅ Error handling robustness

### Monitoring

- **Structured Logging**: Full request/response tracking
- **Performance Metrics**: Response times and success rates
- **Error Tracking**: Comprehensive error categorization
- **Cache Analytics**: Hit rates and invalidation patterns

## Troubleshooting

### Common Issues

**"No articles found"**

- Check if representative name is correct in congress-legislators data
- Verify GDELT API accessibility
- Review search terms generation in logs

**"API timeout"**

- GDELT API may be experiencing load
- System will fall back to cached data
- Retry automatically with exponential backoff

**"Sample data showing"**

- Indicates GDELT API returned no results
- Check if search terms are too restrictive
- May indicate low news coverage for specific member

### Debug Endpoints

- Add `?enhanced=false` to disable advanced queries
- Check search terms in API response
- Review structured logs for detailed error information

## Future Enhancements

### Planned Improvements

1. **Semantic Search**: AI-powered content relevance scoring
2. **Sentiment Analysis**: Article tone and sentiment tracking
3. **Topic Clustering**: Automatic story grouping and threading
4. **Real-time Alerts**: Breaking news notification system
5. **Analytics Dashboard**: News coverage metrics and trends

### Scalability Considerations

- **CDN Integration**: Cache articles at edge locations
- **Database Layer**: Store processed articles for faster access
- **Microservice Architecture**: Separate news service for better scaling
- **Machine Learning**: Improve search relevance with ML models

---

## Technical Implementation Details

### File Structure

```
src/features/news/
├── services/
│   ├── gdelt-api.ts              # Core GDELT API client
│   ├── gdelt-query-builder.ts    # Advanced query construction
│   └── news-clustering.ts        # Article clustering logic
├── components/
│   └── EnhancedNewsFeed.tsx      # UI component
└── utils/
    ├── news-deduplication.ts     # Deduplication algorithms
    └── news-clustering.ts        # Story clustering utilities
```

### Dependencies

- **GDELT V2 DOC API**: External news data source
- **Next.js Caching**: Built-in response caching
- **TypeScript**: Type-safe implementation
- **React Suspense**: Loading state management
- **SWR**: Client-side data fetching (future enhancement)

This integration provides a robust, scalable news system that delivers relevant, timely political news coverage for all members of Congress with excellent performance and reliability.
