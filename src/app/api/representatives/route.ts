import { NextRequest, NextResponse } from 'next/server'
import { cachedFetch } from '@/lib/cache'
import { withRateLimit, publicApiRateLimiter } from '@/lib/middleware/rate-limiter'
import { withValidationAndSecurity, ValidatedRequest } from '@/lib/validation/middleware'
import { ZipCodeValidator, StateValidator } from '@/lib/validation/schemas'
import { withErrorHandling, ExternalApiError, healthChecker } from '@/lib/error-handling/error-handler'
import { getCongressionalDistrictFromZip } from '@/lib/census-api'
import { getRepresentativesByLocation, formatCongressMember } from '@/lib/congress-api'

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

        // Get district from our improved Census API implementation
        const districtInfo = await getCongressionalDistrictFromZip(zipCode)
        
        if (!districtInfo) {
          throw new Error('Could not determine congressional district for ZIP code')
        }

        console.log('District info found:', districtInfo)

        // Fetch representatives using our improved Congress API
        const congressMembers = await getRepresentativesByLocation(
          districtInfo.state,
          districtInfo.district,
          process.env.CONGRESS_API_KEY
        )

        console.log('Congress members found:', congressMembers.length)

        // Transform to our API format
        const representatives: Representative[] = congressMembers.map(member => ({
          bioguideId: member.bioguideId,
          name: member.name,
          firstName: member.name.split(' ')[0] || '',
          lastName: member.name.split(' ').slice(1).join(' ') || '',
          state: member.state,
          district: member.district || null,
          party: member.party,
          chamber: member.chamber,
          imageUrl: member.imageUrl || `/images/representatives/default-${member.chamber.toLowerCase()}.jpg`,
          contactInfo: {
            phone: member.phone || '',
            website: member.website || '',
            office: ''
          },
          committees: member.committees || [],
          social: {
            twitter: undefined,
            facebook: undefined
          }
        }))

        return {
          representatives,
          metadata: {
            dataSource: 'congress.gov + census',
            timestamp: new Date().toISOString(),
            zipCode,
            totalFound: representatives.length,
            district: districtInfo.districtName
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
      zip: (value: any) => ZipCodeValidator.validateZipCode(value)
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