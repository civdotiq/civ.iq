# Vercel Deployment Guide - civic-intel-hub

## 🚀 Quick Deploy Status: ✅ READY

**Critical compatibility fixes completed:**

- ✅ SQLite3 dependency removed
- ✅ Build script serverless-compatible
- ✅ RSS cron job configured for Vercel Cron
- ✅ Production build tested successfully

## Pre-Deployment Setup

### 1. Environment Variables (Required)

Set these in your Vercel dashboard under Project Settings → Environment Variables:

```bash
# Required Government API Keys (all free)
CONGRESS_API_KEY=your_congress_api_key_here
FEC_API_KEY=your_fec_api_key_here
CENSUS_API_KEY=your_census_api_key_here
OPENSTATES_API_KEY=your_openstates_api_key_here

# Congressional Session (current)
CURRENT_CONGRESS=119
CONGRESS_START_DATE=2025-01-03
CONGRESS_END_DATE=2027-01-03

# Optional: RSS Cron Authentication
CRON_SECRET=your_random_secret_string_here

# Optional: Redis (recommended for production)
REDIS_URL=your_redis_connection_string
```

### 2. Get Required API Keys

All APIs are free for civic/government use:

- **Congress.gov**: https://api.congress.gov/sign-up/
- **FEC (Campaign Finance)**: https://api.open.fec.gov/developers/
- **Census Bureau**: https://api.census.gov/data/key_signup.html
- **OpenStates**: https://openstates.org/accounts/profile/

## Deployment Methods

### Option A: GitHub Auto-Deploy (Recommended)

1. **Connect Repository**:

   ```bash
   # Push to main branch
   git add .
   git commit -m "feat: prepare for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Framework preset: Next.js (auto-detected)
   - Root directory: `./` (default)

3. **Configure Environment Variables**:
   - Add all required environment variables listed above
   - Deploy will start automatically

### Option B: Vercel CLI Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod

# Set environment variables
vercel env add CONGRESS_API_KEY
vercel env add FEC_API_KEY
# ... (repeat for all variables)
```

## Post-Deployment Configuration

### 1. Domain Setup (Optional)

```bash
# Add custom domain
vercel domains add yourdomain.com
```

### 2. Redis Setup (Recommended)

For production performance, add Redis:

- **Upstash Redis**: Free tier available
- **Railway**: Redis hosting
- **Redis Cloud**: Managed Redis

### 3. Monitor Deployment

```bash
# Check deployment status
vercel ls

# View logs
vercel logs your-deployment-url
```

## Verification Checklist

After deployment, test these endpoints:

```bash
curl https://your-app.vercel.app/api/health
curl https://your-app.vercel.app/api/representatives?zip=20001
curl https://your-app.vercel.app/api/representative/K000367
```

Expected responses:

- Health: `{"status":"healthy"}`
- Representatives: Array of representatives
- Representative: Single representative object

## Vercel Configuration Details

### Function Timeouts

- Standard API routes: 60 seconds
- Cron jobs: 300 seconds (5 minutes)

### Cron Jobs Configured

- RSS News Aggregator: Every 6 hours (`0 */6 * * *`)

### Security Headers

- Content Security Policy ready
- XSS Protection enabled
- Frame-busting enabled

## Troubleshooting

### Build Failures

```bash
# Common issues and fixes:

# 1. Missing environment variables
Error: "CONGRESS_API_KEY is not defined"
Fix: Add environment variable in Vercel dashboard

# 2. API rate limits during build
Error: "API request failed"
Fix: Build retries automatically, usually resolves

# 3. Memory limit exceeded
Error: "Function exceeded memory limit"
Fix: Optimize API routes, add pagination
```

### Runtime Issues

```bash
# 1. Cold start timeouts
- Normal for serverless functions
- Redis caching reduces impact

# 2. API rate limiting
- Implemented automatically
- 300 requests per 5 minutes per IP

# 3. Missing data
- Check API key permissions
- Verify external API status
```

## Performance Optimization

### Automatic Optimizations

- ✅ Edge caching (5 minutes)
- ✅ Static generation for pages
- ✅ Image optimization
- ✅ Bundle optimization

### Manual Optimizations (Optional)

```bash
# 1. Add Redis caching
REDIS_URL=your_redis_connection

# 2. Enable analytics
vercel analytics enable

# 3. Monitor performance
vercel speed-insights enable
```

## Maintenance

### Regular Tasks

1. **Monitor API usage** - Check API key quotas monthly
2. **Update dependencies** - Security updates quarterly
3. **Review logs** - Check for errors weekly
4. **Cache cleanup** - Automatic via Redis TTL

### Environment Updates

```bash
# Update environment variables
vercel env add NEW_VARIABLE
vercel env rm OLD_VARIABLE

# Redeploy after env changes
vercel --prod
```

## Costs

### Vercel Pricing

- **Hobby Plan**: Free
  - 100GB bandwidth
  - 1,000 serverless functions
  - Perfect for civic projects

- **Pro Plan**: $20/month
  - Unlimited bandwidth
  - Advanced analytics
  - Team collaboration

### External Services

- **Government APIs**: Free
- **Redis (Upstash)**: Free tier (10K requests/day)
- **Total monthly cost**: $0 - $20

## Support

### Documentation

- Next.js: https://nextjs.org/docs
- Vercel: https://vercel.com/docs
- Government APIs: See individual API documentation

### Common Issues

Check these first:

1. Environment variables set correctly
2. API keys have proper permissions
3. Build completed successfully
4. No console errors in browser

### Getting Help

1. Check Vercel deployment logs
2. Review API endpoint responses
3. Monitor function performance
4. Contact via GitHub issues

---

## 🎉 Ready to Deploy!

Your civic-intel-hub is now fully prepared for Vercel deployment with:

- ✅ Serverless compatibility
- ✅ Production build tested
- ✅ Caching optimized
- ✅ Security configured
- ✅ Real government data only

Deploy with confidence! 🚀
