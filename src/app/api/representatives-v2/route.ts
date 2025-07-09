/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCongressionalDistrictFromZip } from '@/lib/census-api'
import { getAllEnhancedRepresentatives } from '@/lib/congress-legislators'

// Simplified response interfaces
interface RepresentativeResponse {
  bioguideId: string
  name: string
  party: string
  state: string
  district?: string
  chamber: string
  title: string
  phone?: string
  website?: string
  contactInfo: {
    phone: string
    website: string
    office: string
  }
}

interface ApiResponse {
  success: boolean
  representatives?: RepresentativeResponse[]
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata: {
    timestamp: string
    zipCode: string
    dataQuality: 'high' | 'medium' | 'low' | 'unavailable'
    dataSource: string
    cacheable: boolean
    freshness?: string
  }
}

// Circuit breaker pattern
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private readonly threshold = 5
  private readonly timeout = 60000 // 1 minute

  async execute<T>(fn: () => Promise<T>, serviceName: string): Promise<T> {
    if (this.isOpen()) {
      throw new Error(`Circuit breaker open for ${serviceName}. Too many recent failures.`)
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private isOpen(): boolean {
    if (this.failures >= this.threshold) {
      return (Date.now() - this.lastFailureTime) < this.timeout
    }
    return false
  }

  private onSuccess(): void {
    this.failures = 0
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
  }

  getStatus() {
    return {
      failures: this.failures,
      isOpen: this.isOpen(),
      lastFailureTime: this.lastFailureTime
    }
  }
}

// Create circuit breakers for external services
const censusCircuitBreaker = new CircuitBreaker()
const congressCircuitBreaker = new CircuitBreaker()

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        break
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt)
      console.log(`Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms delay`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Honest data fetching with transparency
async function getRepresentativesByZip(zipCode: string): Promise<ApiResponse> {
  const startTime = Date.now()
  const metadata: ApiResponse['metadata'] = {
    timestamp: new Date().toISOString(),
    zipCode,
    dataQuality: 'unavailable',
    dataSource: 'none',
    cacheable: false
  }

  try {
    // Step 1: Get district info with circuit breaker and retry
    console.log(`Fetching district info for ZIP ${zipCode}...`)
    
    const districtInfo = await censusCircuitBreaker.execute(
      () => retryWithBackoff(() => getCongressionalDistrictFromZip(zipCode)),
      'Census API'
    )

    if (!districtInfo) {
      return {
        success: false,
        error: {
          code: 'DISTRICT_NOT_FOUND',
          message: `Could not determine congressional district for ZIP code ${zipCode}`,
          details: 'This ZIP code may be invalid or not currently mapped to a congressional district'
        },
        metadata: {
          ...metadata,
          dataQuality: 'unavailable',
          dataSource: 'census-failed'
        }
      }
    }

    console.log(`District found: ${districtInfo.state}-${districtInfo.district}`)

    // Step 2: Get representatives with circuit breaker and retry  
    const allRepresentatives = await congressCircuitBreaker.execute(
      () => retryWithBackoff(() => getAllEnhancedRepresentatives()),
      'Congress Legislators'
    )

    if (!allRepresentatives || allRepresentatives.length === 0) {
      return {
        success: false,
        error: {
          code: 'REPRESENTATIVES_DATA_UNAVAILABLE',
          message: 'Representative data is temporarily unavailable',
          details: 'Congress legislators database could not be accessed'
        },
        metadata: {
          ...metadata,
          dataQuality: 'unavailable',
          dataSource: 'congress-legislators-failed',
          freshness: `District lookup successful (${Date.now() - startTime}ms)`
        }
      }
    }

    // Step 3: Filter representatives for this district
    const districtRepresentatives = allRepresentatives.filter(rep => {
      if (rep.chamber === 'Senate' && rep.state === districtInfo.state) {
        return true
      }
      if (rep.chamber === 'House' && 
          rep.state === districtInfo.state && 
          rep.district === districtInfo.district) {
        return true
      }
      return false
    })

    if (districtRepresentatives.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_REPRESENTATIVES_FOUND',
          message: `No representatives found for ${districtInfo.state}-${districtInfo.district}`,
          details: {
            district: districtInfo.district,
            state: districtInfo.state,
            totalRepsInDatabase: allRepresentatives.length
          }
        },
        metadata: {
          ...metadata,
          dataQuality: 'low',
          dataSource: 'congress-legislators-partial',
          freshness: `Data retrieved in ${Date.now() - startTime}ms`
        }
      }
    }

    // Step 4: Convert to response format
    const representatives: RepresentativeResponse[] = districtRepresentatives.map(rep => ({
      bioguideId: rep.bioguideId,
      name: rep.name,
      party: rep.party,
      state: rep.state,
      district: rep.district,
      chamber: rep.chamber,
      title: rep.title,
      phone: rep.currentTerm?.phone || rep.phone,
      website: rep.currentTerm?.website || rep.website,
      contactInfo: {
        phone: rep.currentTerm?.phone || rep.phone || '',
        website: rep.currentTerm?.website || rep.website || '',
        office: rep.currentTerm?.office || rep.currentTerm?.address || ''
      }
    }))

    // Determine data quality based on completeness
    let dataQuality: 'high' | 'medium' | 'low' = 'high'
    const missingData = representatives.filter(rep => !rep.phone || !rep.website)
    if (missingData.length > 0) {
      dataQuality = representatives.length >= 3 ? 'medium' : 'low'
    }

    return {
      success: true,
      representatives,
      metadata: {
        ...metadata,
        dataQuality,
        dataSource: 'congress-legislators + census',
        cacheable: true,
        freshness: `Retrieved in ${Date.now() - startTime}ms`
      }
    }

  } catch (error) {
    console.error('Error fetching representatives:', error)

    // Determine error type and provide specific messaging
    let errorCode = 'UNKNOWN_ERROR'
    let errorMessage = 'An unexpected error occurred'
    let errorDetails: any = undefined

    if (error instanceof Error) {
      if (error.message.includes('Circuit breaker open')) {
        errorCode = 'SERVICE_TEMPORARILY_UNAVAILABLE'
        errorMessage = 'Government data services are temporarily unavailable due to multiple failures'
        errorDetails = {
          censusStatus: censusCircuitBreaker.getStatus(),
          congressStatus: congressCircuitBreaker.getStatus()
        }
      } else if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
        errorCode = 'SERVICE_TIMEOUT'
        errorMessage = 'Government data services are responding slowly. Please try again.'
      } else if (error.message.includes('API key')) {
        errorCode = 'CONFIGURATION_ERROR'
        errorMessage = 'Service configuration issue. Please contact support.'
      } else {
        errorMessage = error.message
      }
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails
      },
      metadata: {
        ...metadata,
        dataQuality: 'unavailable',
        dataSource: 'error',
        freshness: `Failed after ${Date.now() - startTime}ms`
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const zipCode = url.searchParams.get('zip')

    // Input validation
    if (!zipCode) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ZIP_CODE',
          message: 'ZIP code parameter is required'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          zipCode: '',
          dataQuality: 'unavailable' as const,
          dataSource: 'validation-error',
          cacheable: false
        }
      }, { status: 400 })
    }

    if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_ZIP_CODE',
          message: 'ZIP code must be 5 digits (e.g., 10001) or 9 digits (e.g., 10001-1234)'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          zipCode,
          dataQuality: 'unavailable' as const,
          dataSource: 'validation-error',
          cacheable: false
        }
      }, { status: 400 })
    }

    // Get representatives with honest error handling
    const result = await getRepresentativesByZip(zipCode)

    // Return appropriate HTTP status based on success
    const httpStatus = result.success ? 200 : 503

    return NextResponse.json(result, { status: httpStatus })

  } catch (error) {
    console.error('Unexpected error in representatives API:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal server error occurred'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        zipCode: '',
        dataQuality: 'unavailable' as const,
        dataSource: 'internal-error',
        cacheable: false
      }
    }, { status: 500 })
  }
}