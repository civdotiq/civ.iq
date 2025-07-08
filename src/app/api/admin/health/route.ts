import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { withRateLimit, strictApiRateLimiter } from '@/lib/middleware/rate-limiter'
import { healthChecker } from '@/lib/error-handling/error-handler'

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  services: Array<{
    name: string
    status: 'healthy' | 'degraded' | 'unhealthy'
    responseTime?: number
    lastChecked: string
    error?: string
  }>
  system: {
    nodeVersion: string
    memory: {
      used: number
      total: number
      percentage: number
    }
    environment: string
  }
}

async function checkExternalServices(): Promise<void> {
  const services = [
    {
      name: 'congress-api',
      check: async () => {
        const response = await fetch(
          `https://api.congress.gov/v3/member?api_key=${process.env.CONGRESS_API_KEY}&limit=1`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (!response.ok) throw new Error(`Status: ${response.status}`)
      }
    },
    {
      name: 'census-geocoding',
      check: async () => {
        const response = await fetch(
          'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=10001&benchmark=2020&format=json',
          { signal: AbortSignal.timeout(5000) }
        )
        if (!response.ok) throw new Error(`Status: ${response.status}`)
      }
    },
    {
      name: 'census-tiger',
      check: async () => {
        const response = await fetch(
          'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=1=1&outFields=*&f=json&resultRecordCount=1',
          { signal: AbortSignal.timeout(5000) }
        )
        if (!response.ok) throw new Error(`Status: ${response.status}`)
      }
    },
    {
      name: 'fec-api',
      check: async () => {
        if (!process.env.FEC_API_KEY) throw new Error('API key not configured')
        const response = await fetch(
          `https://api.open.fec.gov/v1/candidates/?api_key=${process.env.FEC_API_KEY}&per_page=1`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (!response.ok) throw new Error(`Status: ${response.status}`)
      }
    }
  ]

  // Check all services in parallel
  await Promise.all(
    services.map(service => 
      healthChecker.checkService(service.name, service.check)
    )
  )
}

async function getSystemHealth(): Promise<SystemHealth> {
  const startTime = Date.now()
  
  // Check external services
  await checkExternalServices()
  
  const serviceHealth = healthChecker.getAllHealth()
  
  // Determine overall system status
  const unhealthyServices = serviceHealth.filter(s => s.status === 'unhealthy')
  const degradedServices = serviceHealth.filter(s => s.status === 'degraded')
  
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  if (unhealthyServices.length > 0) {
    overallStatus = 'unhealthy'
  } else if (degradedServices.length > 0) {
    overallStatus = 'degraded'
  } else {
    overallStatus = 'healthy'
  }

  // Get memory usage
  const memoryUsage = process.memoryUsage()
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
    services: serviceHealth.map(sh => ({
      name: sh.service,
      status: sh.status,
      responseTime: sh.responseTime,
      lastChecked: sh.lastChecked,
      error: sh.error
    })),
    system: {
      nodeVersion: process.version,
      memory: {
        used: memoryUsage.rss,
        total: memoryUsage.rss + memoryUsage.heapTotal,
        percentage: Math.round((memoryUsage.rss / (memoryUsage.rss + memoryUsage.heapTotal)) * 100)
      },
      environment: process.env.NODE_ENV || 'development'
    }
  }
}

async function handleHealthCheck(request: NextRequest): Promise<NextResponse> {
  try {
    const health = await getSystemHealth()
    
    // Return appropriate HTTP status based on health
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503
    
    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      },
      { status: 503 }
    )
  }
}

// GET /api/admin/health - Get system health status
export async function GET(request: NextRequest): Promise<NextResponse> {
  return withRateLimit(
    request,
    () => withAuth(
      request,
      handleHealthCheck,
      {
        requiredForRoutes: ['/api/admin'],
        optionalForRoutes: [],
        adminRoutes: ['/api/admin']
      }
    ),
    strictApiRateLimiter
  )
}