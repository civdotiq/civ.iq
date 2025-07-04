import { NextRequest, NextResponse } from 'next/server'
import { cachedFetch } from '@/lib/cache'
import { withRateLimit, publicApiRateLimiter } from '@/lib/middleware/rate-limiter'
import { withValidationAndSecurity, ValidatedRequest } from '@/lib/validation/middleware'
import { ZipCodeValidator, StateValidator } from '@/lib/validation/schemas'
import { withErrorHandling, ExternalApiError, healthChecker } from '@/lib/error-handling/error-handler'

interface Representative {
  bioguideId: string
  name: string
  firstName: string
  lastName: string
  state: string
  district: string | null
  party: string
  chamber: 'House' | 'Senate'
  imageUrl: string
  contactInfo: {
    phone: string
    website: string
    office: string
  }
  committees: Array<{
    name: string
    role?: string
  }>
  social: {
    twitter?: string
    facebook?: string
  }
}

interface ApiResponse {
  representatives: Representative[]
  metadata: {
    dataSource: string
    timestamp: string
    zipCode: string
    totalFound: number
    note?: string
  }
}

// Fallback data generator
async function generateFallbackData(zipCode: string): Promise<ApiResponse> {
  // In a real application, this might come from a local database or cache
  const mockRepresentatives: Representative[] = [
    {
      bioguideId: 'S000148',
      name: 'Charles E. Schumer',
      firstName: 'Charles',
      lastName: 'Schumer',
      state: 'NY',
      district: null,
      party: 'Democratic',
      chamber: 'Senate',
      imageUrl: '/images/representatives/default-senator.jpg',
      contactInfo: {
        phone: '(202) 224-6542',
        website: 'https://www.schumer.senate.gov',
        office: '322 Hart Senate Office Building'
      },
      committees: [
        { name: 'Committee on Rules and Administration', role: 'Chair' }
      ],
      social: {
        twitter: '@SenSchumer'
      }
    },
    {
      bioguideId: 'G000555',
      name: 'Kirsten E. Gillibrand',
      firstName: 'Kirsten',
      lastName: 'Gillibrand',
      state: 'NY',
      district: null,
      party: 'Democratic',
      chamber: 'Senate',
      imageUrl: '/images/representatives/default-senator.jpg',
      contactInfo: {
        phone: '(202) 224-4451',
        website: 'https://www.gillibrand.senate.gov',
        office: '478 Russell Senate Office Building'
      },
      committees: [
        { name: 'Committee on Armed Services' }
      ],
      social: {
        twitter: '@SenGillibrand'
      }
    }
  ]

  return {
    representatives: mockRepresentatives,
    metadata: {
      dataSource: 'fallback',
      timestamp: new Date().toISOString(),
      zipCode,
      totalFound: mockRepresentatives.length,
      note: 'Fallback data provided due to external API unavailability'
    }
  }
}

// Define validation interface
interface RepresentativesQuery {
  zip: string;
}

// Main handler function with validation
async function handleRepresentativesRequest(request: ValidatedRequest<RepresentativesQuery>): Promise<NextResponse> {
  // Get validated and sanitized input
  const { zip: zipCode } = request.validatedQuery!

  try {
    // Fetch representatives data with caching
    const representatives = await cachedFetch(
      `representatives-${zipCode}`,
      async () => {
        // Health check for Congress API
        await healthChecker.checkService('congress-api', async () => {
          const testResponse = await fetch(
            `https://api.congress.gov/v3/member?api_key=${process.env.CONGRESS_API_KEY}&limit=1`
          )
          if (!testResponse.ok) {
            throw new Error(`Health check failed: ${testResponse.status}`)
          }
        })

        if (!process.env.CONGRESS_API_KEY) {
          throw new ExternalApiError(
            'Congress API key not configured',
            'congress-api'
          )
        }

        // First, get district from Census geocoding
        const geoResponse = await fetch(
          `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(zipCode)}&benchmark=2020&vintage=2020&format=json`
        )

        if (!geoResponse.ok) {
          throw new ExternalApiError(
            'Census geocoding service unavailable',
            'census-geocoding'
          )
        }

        const geoData = await geoResponse.json()
        const congressionalDistrict = geoData.result?.addressMatches?.[0]?.geographies?.['Congressional Districts']?.[0]?.DISTRICT

        if (!congressionalDistrict) {
          throw new Error('Could not determine congressional district for ZIP code')
        }

        // Fetch representatives from Congress API
        const congressResponse = await fetch(
          `https://api.congress.gov/v3/member?api_key=${process.env.CONGRESS_API_KEY}&currentMember=true&state=${geoData.result.addressMatches[0].addressComponents.state}&district=${congressionalDistrict}&format=json`
        )

        if (!congressResponse.ok) {
          throw new ExternalApiError(
            'Congress API service unavailable',
            'congress-api'
          )
        }

        const congressData = await congressResponse.json()
        
        // Transform data to our format
        const representatives: Representative[] = congressData.members?.map((member: any) => ({
          bioguideId: member.bioguideId,
          name: member.directOrderName || `${member.firstName} ${member.lastName}`,
          firstName: member.firstName,
          lastName: member.lastName,
          state: member.state,
          district: member.district || null,
          party: member.partyName,
          chamber: member.chamber as 'House' | 'Senate',
          imageUrl: member.depiction?.imageUrl || `/images/representatives/default-${member.chamber.toLowerCase()}.jpg`,
          contactInfo: {
            phone: member.phone || '',
            website: member.officialWebsiteUrl || '',
            office: member.office || ''
          },
          committees: [], // Would need separate API call to get committee info
          social: {
            twitter: member.twitterId ? `@${member.twitterId}` : undefined,
            facebook: member.facebookId
          }
        })) || []

        return {
          representatives,
          metadata: {
            dataSource: 'congress.gov',
            timestamp: new Date().toISOString(),
            zipCode,
            totalFound: representatives.length
          }
        }
      },
      15 * 60 * 1000 // 15 minutes cache
    )

    return NextResponse.json(representatives)

  } catch (error) {
    // Generate fallback data
    const fallbackData = await generateFallbackData(zipCode)
    
    // Log the error but return fallback data
    console.error('Representatives API error:', error)
    
    return NextResponse.json({
      ...fallbackData,
      metadata: {
        ...fallbackData.metadata,
        originalError: (error as Error).message,
        fallbackReason: error instanceof ExternalApiError ? 
          `${error.service} is currently unavailable` : 
          'Unexpected error occurred'
      }
    })
  }
}

// Export the main GET handler with validation, security, and rate limiting
export const GET = withValidationAndSecurity<RepresentativesQuery>(
  {
    query: {
      zip: ZipCodeValidator.validateZipCode
    },
    sanitizeResponse: true,
    logValidationErrors: true
  },
  async (request: ValidatedRequest<RepresentativesQuery>) => {
    return withRateLimit(
      request,
      () => withErrorHandling(handleRepresentativesRequest)(request),
      publicApiRateLimiter
    )
  }
)