import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasCongressKey: !!process.env.CONGRESS_API_KEY,
      hasFECKey: !!process.env.FEC_API_KEY,
      hasOpenStatesKey: !!process.env.OPENSTATES_API_KEY,
      congressKeyLength: process.env.CONGRESS_API_KEY?.length || 0,
      fecKeyLength: process.env.FEC_API_KEY?.length || 0,
      openStatesKeyLength: process.env.OPENSTATES_API_KEY?.length || 0
    },
    tests: {}
  };

  // Test 1: Census.gov API (no key required)
  try {
    const censusUrl = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=48221&benchmark=Public_AR_Current&vintage=Current_Current&layers=116&format=json';
    console.log('Testing Census API:', censusUrl);
    const censusResponse = await fetch(censusUrl);
    const censusData = await censusResponse.json();
    
    debugInfo.tests.census = {
      status: censusResponse.status,
      ok: censusResponse.ok,
      hasResults: !!censusData.result?.addressMatches?.length,
      resultCount: censusData.result?.addressMatches?.length || 0,
      error: censusData.error || null
    };
  } catch (error: any) {
    debugInfo.tests.census = {
      error: error.message,
      type: 'exception'
    };
  }

  // Test 2: Congress.gov API
  if (process.env.CONGRESS_API_KEY) {
    try {
      const congressUrl = `https://api.congress.gov/v3/member?format=json&limit=2&api_key=${process.env.CONGRESS_API_KEY}`;
      console.log('Testing Congress API with key');
      const congressResponse = await fetch(congressUrl, {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': process.env.CONGRESS_API_KEY
        }
      });
      
      let congressData;
      const responseText = await congressResponse.text();
      
      try {
        congressData = JSON.parse(responseText);
      } catch (e) {
        congressData = { parseError: true, responseText: responseText.substring(0, 200) };
      }
      
      debugInfo.tests.congress = {
        status: congressResponse.status,
        ok: congressResponse.ok,
        headers: Object.fromEntries(congressResponse.headers.entries()),
        hasMembers: !!congressData.members,
        memberCount: congressData.members?.length || 0,
        error: congressData.error || congressData.message || null,
        rawResponse: congressResponse.ok ? 'Success' : responseText.substring(0, 200)
      };
    } catch (error: any) {
      debugInfo.tests.congress = {
        error: error.message,
        type: 'exception'
      };
    }
  } else {
    debugInfo.tests.congress = {
      error: 'No API key found',
      type: 'config'
    };
  }

  // Test 3: FEC API
  if (process.env.FEC_API_KEY) {
    try {
      const fecUrl = `https://api.open.fec.gov/v1/candidates/?api_key=${process.env.FEC_API_KEY}&per_page=2`;
      console.log('Testing FEC API with key');
      const fecResponse = await fetch(fecUrl);
      const fecData = await fecResponse.json();
      
      debugInfo.tests.fec = {
        status: fecResponse.status,
        ok: fecResponse.ok,
        hasResults: !!fecData.results,
        resultCount: fecData.results?.length || 0,
        error: fecData.error || null
      };
    } catch (error: any) {
      debugInfo.tests.fec = {
        error: error.message,
        type: 'exception'
      };
    }
  } else {
    debugInfo.tests.fec = {
      error: 'No API key found',
      type: 'config'
    };
  }

  // Test 4: OpenStates API
  if (process.env.OPENSTATES_API_KEY) {
    try {
      const openStatesUrl = 'https://v3.openstates.org/people?jurisdiction=Michigan&per_page=2';
      console.log('Testing OpenStates API with key');
      const openStatesResponse = await fetch(openStatesUrl, {
        headers: {
          'X-API-KEY': process.env.OPENSTATES_API_KEY
        }
      });
      const openStatesData = await openStatesResponse.json();
      
      debugInfo.tests.openStates = {
        status: openStatesResponse.status,
        ok: openStatesResponse.ok,
        hasResults: !!openStatesData.results,
        resultCount: openStatesData.results?.length || 0,
        error: openStatesData.error || null
      };
    } catch (error: any) {
      debugInfo.tests.openStates = {
        error: error.message,
        type: 'exception'
      };
    }
  } else {
    debugInfo.tests.openStates = {
      error: 'No API key found',
      type: 'config'
    };
  }

  // Test 5: GDELT API (no key required)
  try {
    const gdeltUrl = 'https://api.gdeltproject.org/api/v2/doc/doc?query=Congress&mode=artlist&maxrecords=2&format=json';
    console.log('Testing GDELT API:', gdeltUrl);
    const gdeltResponse = await fetch(gdeltUrl);
    const gdeltText = await gdeltResponse.text();
    
    let gdeltData;
    try {
      gdeltData = JSON.parse(gdeltText);
    } catch (e) {
      gdeltData = { parseError: true, responseText: gdeltText.substring(0, 200) };
    }
    
    debugInfo.tests.gdelt = {
      status: gdeltResponse.status,
      ok: gdeltResponse.ok,
      hasArticles: !!gdeltData.articles,
      articleCount: gdeltData.articles?.length || 0,
      error: gdeltData.error || null,
      parseError: gdeltData.parseError || false
    };
  } catch (error: any) {
    debugInfo.tests.gdelt = {
      error: error.message,
      type: 'exception'
    };
  }

  // Summary
  debugInfo.summary = {
    totalTests: Object.keys(debugInfo.tests).length,
    passed: Object.values(debugInfo.tests).filter((test: any) => test.ok || test.status === 200).length,
    failed: Object.values(debugInfo.tests).filter((test: any) => !test.ok && test.status !== 200).length
  };

  return NextResponse.json(debugInfo, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
