import { NextRequest, NextResponse } from 'next/server';
import { structuredLogger } from '@/lib/logging/logger';
import { redisCache } from '@/lib/cache/redis-client';
import { performanceMonitor, estimateMemoryUsage } from '@/utils/performance';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    externalApis: {
      congress: ServiceHealth;
      census: ServiceHealth;
      fec: ServiceHealth;
      openstates: ServiceHealth;
      gdelt: ServiceHealth;
    };
  };
  performance: {
    memory?: {
      used: number;
      total: number;
      percentage: number;
    };
    averageResponseTime: number;
    requestCount: number;
  };
  features: {
    serviceWorker: boolean;
    redis: boolean;
    validation: boolean;
    logging: boolean;
    deduplication: boolean;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastChecked: string;
  error?: string;
}

// Track request count and response times
let requestCount = 0;
let totalResponseTime = 0;
const startTime = Date.now();

// Middleware to track performance
function trackPerformance() {
  requestCount++;
  const start = Date.now();
  
  return () => {
    const duration = Date.now() - start;
    totalResponseTime += duration;
  };
}

async function checkServiceHealth(
  name: string,
  checkFunction: () => Promise<void>,
  timeout: number = 5000
): Promise<ServiceHealth> {
  const start = Date.now();
  
  try {
    await Promise.race([
      checkFunction(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
    
    const responseTime = Date.now() - start;
    return {
      status: responseTime > 2000 ? 'degraded' : 'healthy',
      responseTime,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkCongressAPI(): Promise<void> {
  if (!process.env.CONGRESS_API_KEY) {
    throw new Error('Congress API key not configured');
  }
  
  const response = await fetch(
    `https://api.congress.gov/v3/member?api_key=${process.env.CONGRESS_API_KEY}&limit=1`,
    { signal: AbortSignal.timeout(4000) }
  );
  
  if (!response.ok) {
    throw new Error(`Congress API returned ${response.status}`);
  }
}

async function checkCensusAPI(): Promise<void> {
  const response = await fetch(
    'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=10001&benchmark=2020&vintage=2020&format=json',
    { signal: AbortSignal.timeout(4000) }
  );
  
  if (!response.ok) {
    throw new Error(`Census API returned ${response.status}`);
  }
}

async function checkFECAPI(): Promise<void> {
  if (!process.env.FEC_API_KEY) {
    throw new Error('FEC API key not configured');
  }
  
  const response = await fetch(
    `https://api.open.fec.gov/v1/candidates/?api_key=${process.env.FEC_API_KEY}&per_page=1`,
    { signal: AbortSignal.timeout(4000) }
  );
  
  if (!response.ok) {
    throw new Error(`FEC API returned ${response.status}`);
  }
}

async function checkOpenStatesAPI(): Promise<void> {
  if (!process.env.OPENSTATES_API_KEY) {
    throw new Error('OpenStates API key not configured');
  }
  
  const response = await fetch(
    'https://v3.openstates.org/jurisdictions',
    {
      headers: {
        'X-API-KEY': process.env.OPENSTATES_API_KEY,
      },
      signal: AbortSignal.timeout(4000)
    }
  );
  
  if (!response.ok) {
    throw new Error(`OpenStates API returned ${response.status}`);
  }
}

async function checkGDELTAPI(): Promise<void> {
  const response = await fetch(
    'https://api.gdeltproject.org/api/v2/doc/doc?query=test&mode=artlist&maxrecords=1&format=json',
    { signal: AbortSignal.timeout(4000) }
  );
  
  if (!response.ok) {
    throw new Error(`GDELT API returned ${response.status}`);
  }
}

async function checkDatabase(): Promise<void> {
  // For now, we don't have a database, so this is a placeholder
  // In the future, this would check database connectivity
  return Promise.resolve();
}

async function checkCache(): Promise<void> {
  const testKey = 'health-check-test';
  const testValue = { timestamp: Date.now() };
  
  // Try to set and get a value from cache
  await redisCache.set(testKey, testValue, 10);
  const retrieved = await redisCache.get(testKey);
  
  if (!retrieved || retrieved.timestamp !== testValue.timestamp) {
    throw new Error('Cache set/get test failed');
  }
  
  await redisCache.delete(testKey);
}

export async function GET(request: NextRequest) {
  const trackEnd = trackPerformance();
  
  try {
    performanceMonitor.startTimer('health-check', {
      operation: 'health_check',
      userAgent: request.headers.get('user-agent')
    });

    // Check all services in parallel
    const [
      databaseHealth,
      cacheHealth,
      congressHealth,
      censusHealth,
      fecHealth,
      openstatesHealth,
      gdeltHealth
    ] = await Promise.all([
      checkServiceHealth('database', checkDatabase),
      checkServiceHealth('cache', checkCache),
      checkServiceHealth('congress', checkCongressAPI),
      checkServiceHealth('census', checkCensusAPI),
      checkServiceHealth('fec', checkFECAPI),
      checkServiceHealth('openstates', checkOpenStatesAPI),
      checkServiceHealth('gdelt', checkGDELTAPI)
    ]);

    const cacheStatus = redisCache.getStatus();
    const memory = estimateMemoryUsage();
    const uptime = Date.now() - startTime;
    const averageResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0;

    // Determine overall health status
    const services = [
      databaseHealth,
      cacheHealth,
      congressHealth,
      censusHealth,
      fecHealth,
      openstatesHealth,
      gdeltHealth
    ];

    const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices > 2) {
      overallStatus = 'unhealthy';
    } else if (unhealthyServices > 0 || degradedServices > 1) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const healthCheck: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime,
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: databaseHealth,
        cache: cacheHealth,
        externalApis: {
          congress: congressHealth,
          census: censusHealth,
          fec: fecHealth,
          openstates: openstatesHealth,
          gdelt: gdeltHealth
        }
      },
      performance: {
        memory,
        averageResponseTime,
        requestCount
      },
      features: {
        serviceWorker: true,
        redis: cacheStatus.isConnected,
        validation: true,
        logging: true,
        deduplication: true
      }
    };

    const duration = performanceMonitor.endTimer('health-check');

    // Log health check results
    structuredLogger.info('Health check completed', {
      status: overallStatus,
      duration,
      unhealthyServices,
      degradedServices,
      redisConnected: cacheStatus.isConnected,
      memoryUsagePercent: memory?.percentage,
      operation: 'health_check_complete'
    }, request);

    trackEnd();

    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                     overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheck, { status: httpStatus });

  } catch (error) {
    performanceMonitor.endTimer('health-check');
    trackEnd();

    structuredLogger.error('Health check failed', error, {
      operation: 'health_check_error'
    }, request);

    const errorResponse: HealthCheck = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Date.now() - startTime,
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: { status: 'unhealthy', lastChecked: new Date().toISOString(), error: 'Health check failed' },
        cache: { status: 'unhealthy', lastChecked: new Date().toISOString(), error: 'Health check failed' },
        externalApis: {
          congress: { status: 'unhealthy', lastChecked: new Date().toISOString(), error: 'Health check failed' },
          census: { status: 'unhealthy', lastChecked: new Date().toISOString(), error: 'Health check failed' },
          fec: { status: 'unhealthy', lastChecked: new Date().toISOString(), error: 'Health check failed' },
          openstates: { status: 'unhealthy', lastChecked: new Date().toISOString(), error: 'Health check failed' },
          gdelt: { status: 'unhealthy', lastChecked: new Date().toISOString(), error: 'Health check failed' }
        }
      },
      performance: {
        memory: estimateMemoryUsage(),
        averageResponseTime: requestCount > 0 ? totalResponseTime / requestCount : 0,
        requestCount
      },
      features: {
        serviceWorker: true,
        redis: false,
        validation: true,
        logging: true,
        deduplication: true
      }
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

// Simple health endpoint for load balancers
export async function HEAD(request: NextRequest) {
  try {
    // Quick cache check only
    const cacheStatus = redisCache.getStatus();
    
    if (cacheStatus.isConnected) {
      return new NextResponse(null, { status: 200 });
    } else {
      return new NextResponse(null, { status: 503 });
    }
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}