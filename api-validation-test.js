#!/usr/bin/env node

/* eslint-disable no-console, @typescript-eslint/no-require-imports */
/**
 * CORS & API Validation Script for Wikipedia/Wikidata APIs
 *
 * This script validates the critical assumptions about external API accessibility
 * for our client-side biography feature implementation.
 *
 * Tests:
 * 1. Wikipedia REST API CORS support
 * 2. Wikidata SPARQL API CORS support
 * 3. Response format validation
 * 4. Rate limiting behavior
 *
 * Run with: node api-validation-test.js
 */

const https = require('https');
const { URL } = require('url');

// Test configuration
const TEST_BIOGUIDE_ID = 'S000033'; // Bernie Sanders - reliable test case
const TEST_REP_NAME = 'Bernie Sanders';
const WIKIPEDIA_PAGE = 'Bernie_Sanders';

/**
 * Enhanced fetch function that captures full response details
 */
async function testApiEndpoint(url, description, options = {}) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`📍 URL: ${url}`);

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub-ValidationScript/1.0 (https://civ.iq) CORS-Test',
        Origin: 'https://civ.iq', // Simulate production origin
        ...options.headers,
      },
    };

    const req = https.request(requestOptions, res => {
      let data = '';

      // Log response headers
      console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`🔧 Headers:`);
      Object.entries(res.headers).forEach(([key, value]) => {
        if (
          key.toLowerCase().includes('cors') ||
          key.toLowerCase().includes('access-control') ||
          key.toLowerCase() === 'server' ||
          key.toLowerCase() === 'content-type'
        ) {
          console.log(`   ${key}: ${value}`);
        }
      });

      // Check CORS headers specifically
      const corsOrigin = res.headers['access-control-allow-origin'];
      const corsHeaders = res.headers['access-control-allow-headers'];
      const corsMethods = res.headers['access-control-allow-methods'];

      console.log(`🌐 CORS Analysis:`);
      console.log(`   Allow-Origin: ${corsOrigin || 'NOT SET'}`);
      console.log(`   Allow-Headers: ${corsHeaders || 'NOT SET'}`);
      console.log(`   Allow-Methods: ${corsMethods || 'NOT SET'}`);

      // Determine CORS compatibility
      const corsSupported =
        corsOrigin === '*' ||
        corsOrigin === 'https://civ.iq' ||
        corsOrigin === 'https://localhost:3000';

      console.log(`✅ CORS Support: ${corsSupported ? 'YES' : 'NO'}`);

      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`📦 Response Size: ${data.length} characters`);
          console.log(`🔍 Data Preview: ${JSON.stringify(jsonData).substring(0, 200)}...`);

          resolve({
            success: res.statusCode === 200,
            corsSupported,
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawSize: data.length,
          });
        } catch (parseError) {
          console.log(`❌ JSON Parse Error: ${parseError.message}`);
          console.log(`📄 Raw Response Preview: ${data.substring(0, 500)}...`);

          resolve({
            success: false,
            corsSupported,
            statusCode: res.statusCode,
            headers: res.headers,
            parseError: parseError.message,
            rawData: data.substring(0, 1000),
          });
        }
      });
    });

    req.on('error', error => {
      console.log(`❌ Request Error: ${error.message}`);
      reject({
        success: false,
        corsSupported: false,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      console.log(`⏱️ Request Timeout`);
      req.destroy();
      reject({
        success: false,
        corsSupported: false,
        error: 'Request timeout',
      });
    });

    req.setTimeout(10000); // 10 second timeout
    req.end();
  });
}

/**
 * Main validation routine
 */
async function runValidationTests() {
  console.log('🚀 Starting CORS & API Validation Tests');
  console.log('='.repeat(60));

  const results = {
    wikipedia: {},
    wikidata: {},
    summary: {},
  };

  try {
    // Test 1: Wikipedia REST API - Page Summary
    console.log('\n📚 WIKIPEDIA API TESTS');
    console.log('-'.repeat(40));

    const wikipediaSummaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${WIKIPEDIA_PAGE}`;
    results.wikipedia.summary = await testApiEndpoint(
      wikipediaSummaryUrl,
      'Wikipedia Page Summary API'
    );

    // Test 2: Wikipedia REST API - Search
    const wikipediaSearchUrl = `https://en.wikipedia.org/api/rest_v1/page/search/${encodeURIComponent(TEST_REP_NAME)}`;
    results.wikipedia.search = await testApiEndpoint(wikipediaSearchUrl, 'Wikipedia Search API');

    // Test 3: Wikidata SPARQL - Find Entity by Bioguide ID
    console.log('\n🗃️ WIKIDATA API TESTS');
    console.log('-'.repeat(40));

    const sparqlQuery1 = `SELECT ?person WHERE { ?person wdt:P1157 "${TEST_BIOGUIDE_ID}" . }`;
    const wikidataFindUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery1)}&format=json`;
    results.wikidata.find = await testApiEndpoint(
      wikidataFindUrl,
      'Wikidata SPARQL - Find by Bioguide ID'
    );

    // Test 4: Wikidata SPARQL - Get Biographical Info
    const sparqlQuery2 = `
      SELECT ?birthDate ?birthPlaceLabel ?educationLabel ?occupationLabel WHERE {
        wd:Q359442 wdt:P569 ?birthDate .
        OPTIONAL { wd:Q359442 wdt:P19 ?birthPlace . }
        OPTIONAL { wd:Q359442 wdt:P69 ?education . }
        OPTIONAL { wd:Q359442 wdt:P106 ?occupation . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 5
    `;
    const wikidataBioUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery2)}&format=json`;
    results.wikidata.biography = await testApiEndpoint(
      wikidataBioUrl,
      'Wikidata SPARQL - Biographical Data'
    );
  } catch (error) {
    console.error('❌ Critical test failure:', error);
  }

  // Generate Summary Report
  console.log('\n📋 VALIDATION SUMMARY REPORT');
  console.log('='.repeat(60));

  const wikipediaWorking = results.wikipedia.summary?.success && results.wikipedia.search?.success;
  const wikidataWorking = results.wikidata.find?.success && results.wikidata.biography?.success;

  const wikipediaCORS =
    results.wikipedia.summary?.corsSupported && results.wikipedia.search?.corsSupported;
  const wikidataCORS =
    results.wikidata.find?.corsSupported && results.wikidata.biography?.corsSupported;

  console.log(`\n🔍 API Functionality:`);
  console.log(`   Wikipedia APIs: ${wikipediaWorking ? '✅ Working' : '❌ Failed'}`);
  console.log(`   Wikidata APIs:  ${wikidataWorking ? '✅ Working' : '❌ Failed'}`);

  console.log(`\n🌐 CORS Support:`);
  console.log(`   Wikipedia CORS: ${wikipediaCORS ? '✅ Supported' : '❌ Blocked'}`);
  console.log(`   Wikidata CORS:  ${wikidataCORS ? '✅ Supported' : '❌ Blocked'}`);

  // Risk Assessment
  console.log(`\n⚠️ RISK ASSESSMENT:`);

  if (!wikipediaCORS && !wikidataCORS) {
    console.log(`   🔴 HIGH RISK: Both APIs block CORS - client-side implementation will fail`);
    console.log(`   📋 Action Required: Revert to server-side proxy or implement CORS proxy`);
  } else if (!wikipediaCORS || !wikidataCORS) {
    console.log(
      `   🟡 MEDIUM RISK: Partial CORS support - component will have limited functionality`
    );
    console.log(`   📋 Action Required: Implement fallback for blocked API`);
  } else {
    console.log(`   🟢 LOW RISK: Full CORS support confirmed`);
    console.log(`   📋 Action Required: Monitor for rate limiting in production`);
  }

  // Rate Limiting Check
  if (results.wikipedia.summary?.headers?.['x-ratelimit-remaining']) {
    console.log(`\n📊 Rate Limiting Info:`);
    console.log(
      `   Wikipedia Remaining: ${results.wikipedia.summary.headers['x-ratelimit-remaining']}`
    );
  }

  // Implementation Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);

  if (wikipediaCORS && wikidataCORS) {
    console.log(`   ✅ Client-side implementation is viable`);
    console.log(`   📝 Implement localStorage caching to reduce API calls`);
    console.log(`   📝 Add graceful degradation for partial failures`);
    console.log(`   📝 Monitor production usage for rate limiting`);
  } else {
    console.log(`   ❌ Client-side implementation not viable without CORS proxy`);
    console.log(`   📝 Consider server-side proxy or public CORS proxy service`);
    console.log(`   📝 Implement fallback to cached/static data`);
  }

  results.summary = {
    wikipediaWorking,
    wikidataWorking,
    wikipediaCORS,
    wikidataCORS,
    viable: wikipediaCORS && wikidataCORS,
    timestamp: new Date().toISOString(),
  };

  console.log(`\n📄 Full results saved to validation-results.json`);
  require('fs').writeFileSync('validation-results.json', JSON.stringify(results, null, 2));

  return results;
}

// Run the tests
if (require.main === module) {
  runValidationTests()
    .then(results => {
      console.log(`\n🏁 Validation Complete`);
      process.exit(results.summary.viable ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Fatal validation error:', error);
      process.exit(1);
    });
}

module.exports = { runValidationTests };
