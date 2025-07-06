import { NextRequest, NextResponse } from 'next/server'
import { cachedFetch } from '@/lib/cache'
import { withRateLimit, publicApiRateLimiter } from '@/lib/middleware/rate-limiter'
import { withValidationAndSecurity, ValidatedRequest } from '@/lib/validation/middleware'
import { ZipCodeValidator, StateValidator } from '@/lib/validation/schemas'
import { withErrorHandling, ExternalApiError, healthChecker } from '@/lib/error-handling/error-handler'
import { getCongressionalDistrictFromZip } from '@/lib/census-api'
import { getRepresentativesByLocation, formatCongressMember } from '@/lib/congress-api'
import { getAllEnhancedRepresentatives, getEnhancedRepresentative } from '@/lib/congress-legislators'
import { structuredLogger } from '@/lib/logging/logger'
import type { EnhancedRepresentative, RepresentativeSummary } from '@/types/representative'

// Use enhanced representative summary for API responses
interface RepresentativeResponse extends RepresentativeSummary {
  contactInfo: {
    phone: string
    website: string
    office: string
    contactForm?: string
  }
  committees: Array<{
    name: string
    role?: string
  }>
  social: {
    twitter?: string
    facebook?: string
    youtube?: string
    instagram?: string
  }
  bio?: {
    gender?: 'M' | 'F'
    stateRank?: 'junior' | 'senior'
  }
  ids?: {
    govtrack?: number
    opensecrets?: string
    wikipedia?: string
  }
}

interface ApiResponse {
  representatives: RepresentativeResponse[]
  metadata: {
    dataSource: string
    timestamp: string
    zipCode: string
    totalFound: number
    district?: string
    note?: string
    dataSources?: string[]
    enhancedDataUsed?: boolean
  }
}

// Helper function to convert enhanced representative to API response format
function convertToResponseFormat(enhanced: EnhancedRepresentative): RepresentativeResponse {
  return {
    bioguideId: enhanced.bioguideId,
    name: enhanced.name,
    party: enhanced.party,
    state: enhanced.state,
    district: enhanced.district,
    chamber: enhanced.chamber,
    title: enhanced.title,
    imageUrl: enhanced.imageUrl,
    website: enhanced.currentTerm?.website || enhanced.website,
    phone: enhanced.currentTerm?.phone || enhanced.phone,
    contactInfo: {
      phone: enhanced.currentTerm?.phone || enhanced.phone || '',
      website: enhanced.currentTerm?.website || enhanced.website || '',
      office: enhanced.currentTerm?.office || enhanced.currentTerm?.address || '',
      contactForm: enhanced.currentTerm?.contactForm
    },
    committees: enhanced.committees || [],
    social: {
      twitter: enhanced.socialMedia?.twitter,
      facebook: enhanced.socialMedia?.facebook,
      youtube: enhanced.socialMedia?.youtube,
      instagram: enhanced.socialMedia?.instagram
    },
    bio: {
      gender: enhanced.bio?.gender,
      stateRank: enhanced.currentTerm?.stateRank
    },
    ids: {
      govtrack: enhanced.ids?.govtrack,
      opensecrets: enhanced.ids?.opensecrets,
      wikipedia: enhanced.ids?.wikipedia
    }
  }
}

// Enhanced function to get representatives by ZIP code using congress-legislators data
async function getEnhancedRepresentativesByZip(zipCode: string): Promise<ApiResponse> {
  try {
    structuredLogger.info('Fetching enhanced representatives by ZIP', { zipCode })
    
    // Get district information
    const districtInfo = await getCongressionalDistrictFromZip(zipCode)
    if (!districtInfo) {
      throw new Error('Could not determine congressional district for ZIP code')
    }

    structuredLogger.info('District info found', { 
      zipCode, 
      state: districtInfo.state, 
      district: districtInfo.district 
    })

    // Get all enhanced representatives
    const allEnhanced = await getAllEnhancedRepresentatives()
    
    if (!allEnhanced || allEnhanced.length === 0) {
      throw new Error('No enhanced representative data available')
    }

    // Filter representatives for this ZIP code's district
    const districtRepresentatives = allEnhanced.filter(rep => {
      // Include senators from the state
      if (rep.chamber === 'Senate' && rep.state === districtInfo.state) {
        return true
      }
      
      // Include House rep from the specific district
      if (rep.chamber === 'House' && 
          rep.state === districtInfo.state && 
          rep.district === districtInfo.district) {
        return true
      }
      
      return false
    })

    structuredLogger.info('Found district representatives', {
      zipCode,
      totalFound: districtRepresentatives.length,
      senators: districtRepresentatives.filter(r => r.chamber === 'Senate').length,
      houseReps: districtRepresentatives.filter(r => r.chamber === 'House').length
    })

    // Convert to response format
    const representatives = districtRepresentatives.map(convertToResponseFormat)

    return {
      representatives,
      metadata: {
        dataSource: 'congress-legislators + census',
        timestamp: new Date().toISOString(),
        zipCode,
        totalFound: representatives.length,
        district: districtInfo.districtName || `${districtInfo.state}-${districtInfo.district}`,
        dataSources: ['congress-legislators', 'census.gov'],
        enhancedDataUsed: true
      }
    }
  } catch (error) {
    structuredLogger.error('Enhanced representatives lookup failed', error as Error, { zipCode })
    throw error
  }
}

// Fallback data generator
async function generateFallbackData(zipCode: string): Promise<ApiResponse> {
  // In a real application, this might come from a local database or cache
  const mockRepresentatives: RepresentativeResponse[] = [
    {
      bioguideId: 'S000148',
      name: 'Charles E. Schumer',
      party: 'Democratic',
      state: 'NY',
      district: undefined,
      chamber: 'Senate',
      title: 'U.S. Senator',
      imageUrl: '/images/representatives/default-senator.jpg',
      website: 'https://www.schumer.senate.gov',
      phone: '(202) 224-6542',
      contactInfo: {
        phone: '(202) 224-6542',
        website: 'https://www.schumer.senate.gov',
        office: '322 Hart Senate Office Building'
      },
      committees: [
        { name: 'Committee on Rules and Administration', role: 'Chair' }
      ],
      social: {
        twitter: 'SenSchumer'
      },
      bio: {
        gender: 'M',
        stateRank: 'senior'
      }
    },
    {
      bioguideId: 'G000555',
      name: 'Kirsten E. Gillibrand',
      party: 'Democratic',
      state: 'NY',
      district: undefined,
      chamber: 'Senate',
      title: 'U.S. Senator',
      imageUrl: '/images/representatives/default-senator.jpg',
      website: 'https://www.gillibrand.senate.gov',
      phone: '(202) 224-4451',
      contactInfo: {
        phone: '(202) 224-4451',
        website: 'https://www.gillibrand.senate.gov',
        office: '478 Russell Senate Office Building'
      },
      committees: [
        { name: 'Committee on Armed Services' }
      ],
      social: {
        twitter: 'SenGillibrand'
      },
      bio: {
        gender: 'F',
        stateRank: 'junior'
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
    structuredLogger.info('Processing representatives request', { zipCode })

    // Try enhanced congress-legislators approach first
    const representatives = await cachedFetch(
      `enhanced-representatives-${zipCode}`,
      async () => {
        try {
          // Strategy 1: Enhanced congress-legislators data (preferred)
          return await getEnhancedRepresentativesByZip(zipCode)
        } catch (enhancedError) {
          structuredLogger.warn('Enhanced approach failed, trying Congress.gov fallback', {
            zipCode,
            error: (enhancedError as Error).message
          })

          // Strategy 2: Fallback to Congress.gov API
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

          // Get district information
          const districtInfo = await getCongressionalDistrictFromZip(zipCode)
          if (!districtInfo) {
            throw new Error('Could not determine congressional district for ZIP code')
          }

          structuredLogger.info('Using Congress.gov fallback', { zipCode, districtInfo })

          // Fetch representatives using Congress API
          const congressMembers = await getRepresentativesByLocation(
            districtInfo.state,
            districtInfo.district,
            process.env.CONGRESS_API_KEY
          )

          // Transform to enhanced format
          const representatives: RepresentativeResponse[] = await Promise.all(
            congressMembers.map(async (member) => {
              // Try to enhance with congress-legislators data
              let enhanced: EnhancedRepresentative | null = null
              try {
                enhanced = await getEnhancedRepresentative(member.bioguideId)
              } catch (error) {
                structuredLogger.warn('Could not enhance individual representative', {
                  bioguideId: member.bioguideId,
                  error: (error as Error).message
                })
              }

              if (enhanced) {
                return convertToResponseFormat(enhanced)
              }

              // Fallback to Congress.gov data only
              return {
                bioguideId: member.bioguideId,
                name: member.name,
                party: member.party,
                state: member.state,
                district: member.district || undefined,
                chamber: member.chamber,
                title: member.chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative',
                imageUrl: member.imageUrl || `/images/representatives/default-${member.chamber.toLowerCase()}.jpg`,
                website: member.website,
                phone: member.phone,
                contactInfo: {
                  phone: member.phone || '',
                  website: member.website || '',
                  office: ''
                },
                committees: member.committees || [],
                social: {}
              }
            })
          )

          return {
            representatives,
            metadata: {
              dataSource: 'congress.gov + partial enhancement',
              timestamp: new Date().toISOString(),
              zipCode,
              totalFound: representatives.length,
              district: districtInfo.districtName,
              dataSources: ['congress.gov', 'congress-legislators'],
              enhancedDataUsed: false
            }
          }
        }
      },
      15 * 60 * 1000 // 15 minutes cache
    )

    structuredLogger.info('Successfully retrieved representatives', {
      zipCode,
      totalFound: representatives.representatives.length,
      dataSource: representatives.metadata.dataSource
    })

    return NextResponse.json(representatives)

  } catch (error) {
    structuredLogger.error('Representatives API error', error as Error, { zipCode })
    
    // Generate fallback data
    const fallbackData = await generateFallbackData(zipCode)
    
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