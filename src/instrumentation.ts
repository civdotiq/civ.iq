/**
 * Next.js Instrumentation
 * This file runs once when the Next.js server starts
 */

/* eslint-disable no-console */

export async function register() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚀 Civic Intel Hub starting up...`);
  console.log(`[${timestamp}] Node version: ${process.version}`);
  console.log(`[${timestamp}] Environment: ${process.env.NODE_ENV}`);

  // Log when we're about to fetch congress data
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[${timestamp}] 📊 Preparing to fetch congress-legislators data on first request...`
    );
    console.log(`[${timestamp}] ℹ️  Initial data fetch may take 10-20 seconds`);
    console.log(`[${timestamp}] ℹ️  Data will be cached for faster subsequent loads`);
  }

  // Log Redis connection status
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = process.env.REDIS_PORT || '6379';
  console.log(
    `[${timestamp}] 🔗 Redis cache: ${redisHost}:${redisPort} (configured: ${!!process.env.REDIS_HOST})`
  );

  // Log API key status
  console.log(`[${timestamp}] 🔑 API Keys Status:`);
  console.log(`[${timestamp}]    - Congress API: ${!!process.env.CONGRESS_API_KEY ? '✅' : '❌'}`);
  console.log(`[${timestamp}]    - FEC API: ${!!process.env.FEC_API_KEY ? '✅' : '❌'}`);
  console.log(`[${timestamp}]    - Census API: ${!!process.env.CENSUS_API_KEY ? '✅' : '❌'}`);
  console.log(
    `[${timestamp}]    - OpenStates API: ${!!process.env.OPENSTATES_API_KEY ? '✅' : '❌'}`
  );
  console.log(`[${timestamp}]    - OpenAI API: ${!!process.env.OPENAI_API_KEY ? '✅' : '❌'}`);

  // Error handling setup complete (global handlers configured in server context only)

  console.log(`[${timestamp}] ✅ Civic Intel Hub startup complete`);
}
