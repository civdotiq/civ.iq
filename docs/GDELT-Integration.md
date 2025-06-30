# GDELT API Integration Documentation

## Overview

The GDELT (Global Database of Events, Language, and Tone) integration provides real-time news tracking for political representatives using the GDELT 2.0 API. This implementation focuses on civic/political news with neutral, factual presentation.

## Key Features

### ✅ Robust Error Handling
- **Exponential backoff retry logic** for transient failures
- **Graceful degradation** with fallback content when GDELT is unavailable
- **Rate limiting** (30 calls/minute) to respect GDELT's servers
- **Timeout protection** (15 seconds) to prevent hanging requests

### ✅ Optimized Search Strategy
- **Civic-focused search terms** targeting political/government content
- **Multi-term queries** for comprehensive coverage
- **Theme filtering** using GDELT's built-in categories (GENERAL_GOVERNMENT, POLITICAL_PROCESS)
- **Deduplication** to remove redundant articles

### ✅ Quality Assurance
- **Language filtering** (English only)
- **Content quality checks** (title length, error detection)
- **Freshness filters** (30-day maximum age)
- **Source filtering** (excludes social media, focuses on news sources)

### ✅ Performance Optimization
- **30-minute caching** as specified in project requirements
- **Parallel search processing** with error isolation
- **Efficient data normalization** with consistent formatting

### ✅ Sentiment Neutrality
- **No sentiment analysis** or bias scoring
- **Factual presentation** of article titles and sources only
- **Neutral aggregation** without editorial interpretation

## API Endpoints

### Primary News Endpoint
```
GET /api/representative/[bioguideId]/news?limit=15
```

**Response Format:**
```json
{
  "articles": [
    {
      "title": "Article Title",
      "url": "https://example.com/article",
      "source": "News Source",
      "publishedDate": "2024-12-30T10:00:00Z",
      "language": "English",
      "domain": "example.com",
      "summary": "Optional summary text"
    }
  ],
  "totalResults": 10,
  "searchTerms": ["search term 1", "search term 2"],
  "dataSource": "gdelt|cached|fallback",
  "cacheStatus": "Live news data"
}
```

### Testing Endpoint
```
GET /api/test-gdelt?q="Representative Name"&type=basic|optimized|comprehensive
```

## Implementation Details

### Rate Limiting
- **30 calls per minute** maximum to GDELT API
- **Automatic queuing** when rate limit reached
- **Call tracking** with 1-minute sliding window

### Search Term Generation
```typescript
generateOptimizedSearchTerms(name, state, district) -> string[]
```

**Example output for "Gary Peters" (Michigan Senator):**
- `"Gary Peters" AND (Congress OR Senate OR House OR Representative OR legislation)`
- `"Senator Gary Peters" AND "Michigan" AND (bill OR amendment OR hearing)`
- `"Gary Peters" AND "Senate" AND "Michigan"`

### Error Handling Strategy
1. **Retry with exponential backoff** (1s, 2s, 4s, 8s max)
2. **Continue with other search terms** if one fails
3. **Return partial results** rather than complete failure
4. **Fallback to relevant mock content** if no real articles found
5. **Log errors comprehensively** for debugging

### Data Normalization
- **Title cleaning** (remove source suffixes, normalize whitespace)
- **Date standardization** (GDELT format → ISO 8601)
- **Source name mapping** (domain → friendly name)
- **URL validation** and deduplication

## Configuration

### Environment Variables
```env
# Optional: Feature flag to disable news (defaults to enabled)
ENABLE_NEWS=true

# Optional: GDELT API URL override (defaults to official API)
GDELT_API_URL=https://api.gdeltproject.org/api/v2/
```

### Cache Settings
- **TTL**: 30 minutes (1,800 seconds)
- **Key format**: `news-{bioguideId}-{limit}`
- **Storage**: In-memory cache with automatic expiration

## Testing

### Manual Testing
```bash
# Test basic GDELT connectivity
curl "/api/test-gdelt?q=Gary%20Peters&type=basic"

# Test optimized search terms
curl "/api/test-gdelt?q=Gary%20Peters&type=optimized"

# Test comprehensive error handling
curl "/api/test-gdelt?q=Gary%20Peters&type=comprehensive"

# Test actual representative news
curl "/api/representative/P000595/news"
```

### Frontend Integration
The `EnhancedNewsFeed` component automatically:
- **Fetches news** on component mount
- **Auto-refreshes** every 10 minutes
- **Provides manual refresh** button
- **Filters by source and timeframe**
- **Shows cache status** and data source

## Troubleshooting

### Common Issues

**1. "GDELT API request timeout"**
- Usually indicates network connectivity issues
- Retry logic will automatically handle this
- Check internet connectivity and DNS resolution

**2. "Rate limited, waiting Xms"**
- Normal behavior when making many requests
- System automatically waits and retries
- Consider reducing refresh frequency if persistent

**3. "Empty response from GDELT API"**
- May indicate search terms are too specific
- Fallback content will be provided automatically
- Try broader search terms for testing

**4. "Failed to parse GDELT JSON response"**
- Usually indicates API format changes
- Check GDELT API documentation for updates
- Enable debug logging to see raw response

### Debug Mode
Set `NODE_ENV=development` to enable verbose logging:
- API request URLs and timing
- Search term generation details
- Error messages with stack traces
- Cache hit/miss information

## Maintenance

### Regular Maintenance Tasks
1. **Monitor GDELT API status** - Check if endpoints change
2. **Review error logs** - Look for patterns in failures
3. **Update source mapping** - Add new news domains as they appear
4. **Performance monitoring** - Track response times and cache efficiency

### Future Improvements
- **Redis caching** for better performance in production
- **Webhook notifications** for real-time news updates
- **Advanced search operators** for more precise queries
- **Multi-language support** if needed for international representatives

## Security Considerations

### Data Privacy
- **No personal data collection** from news articles
- **Public information only** from government representatives
- **No tracking or analytics** on news consumption

### API Security
- **No API keys required** for GDELT (public API)
- **Rate limiting prevents abuse** of external services
- **Input validation** on all search parameters
- **Safe error handling** without exposing internal details

## Architecture

```
Representative Page
       ↓
EnhancedNewsFeed Component
       ↓
/api/representative/[id]/news
       ↓
cachedFetch (30min TTL)
       ↓
generateOptimizedSearchTerms()
       ↓
fetchGDELTNews() [with retry & rate limiting]
       ↓
GDELT 2.0 API
       ↓
normalizeGDELTArticle()
       ↓
Quality Filters & Deduplication
       ↓
JSON Response
```

This implementation provides a robust, efficient, and user-friendly news integration that respects both GDELT's infrastructure and the project's requirements for neutral, factual news presentation.