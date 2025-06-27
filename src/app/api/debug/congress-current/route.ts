import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const apiKey = process.env.CONGRESS_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'No Congress API key found' }, { status: 500 });
  }

  const tests: any = {
    apiKeyInfo: {
      exists: true,
      length: apiKey.length,
      firstChars: apiKey.substring(0, 4) + '...',
      lastChars: '...' + apiKey.substring(apiKey.length - 4)
    },
    tests: []
  };

  // Test 1: Current members with different approach
  try {
    // Try using currentMember=true more explicitly
    const currentUrl = `https://api.congress.gov/v3/member?format=json&limit=20&currentMember=true&api_key=${apiKey}`;
    console.log('Testing current members only...');
    
    const response = await fetch(currentUrl);
    const data = await response.json();
    
    // Filter results to only show members with recent terms
    const currentYear = 2025;
    const recentMembers = data.members?.filter((member: any) => {
      const latestTerm = member.terms?.item?.[0];
      return latestTerm && (!latestTerm.endYear || latestTerm.endYear >= currentYear - 1);
    });
    
    tests.tests.push({
      name: 'Current Members (filtered)',
      url: currentUrl.replace(apiKey, 'API_KEY_HIDDEN'),
      status: response.status,
      ok: response.ok,
      totalReturned: data.members?.length || 0,
      recentMembersCount: recentMembers?.length || 0,
      recentMembers: recentMembers?.slice(0, 5).map((m: any) => ({
        name: m.name,
        state: m.state,
        party: m.partyName,
        bioguideId: m.bioguideId,
        latestTerm: m.terms?.item?.[0]
      }))
    });
  } catch (error: any) {
    tests.tests.push({
      name: 'Current Members (filtered)',
      error: error.message
    });
  }

  // Test 2: Specific member lookup (Gary Peters)
  try {
    const petersUrl = `https://api.congress.gov/v3/member/P000595?format=json&api_key=${apiKey}`;
    console.log('Testing specific member: Gary Peters...');
    
    const response = await fetch(petersUrl);
    const data = await response.json();
    
    tests.tests.push({
      name: 'Gary Peters Lookup',
      url: petersUrl.replace(apiKey, 'API_KEY_HIDDEN'),
      status: response.status,
      ok: response.ok,
      member: data.member ? {
        name: `${data.member.firstName} ${data.member.lastName}`,
        state: data.member.state,
        party: data.member.partyName,
        currentMember: data.member.currentMember,
        terms: data.member.terms?.length || 0,
        latestCongress: data.member.terms?.[0]?.congress
      } : null
    });
  } catch (error: any) {
    tests.tests.push({
      name: 'Gary Peters Lookup',
      error: error.message
    });
  }

  // Test 3: Try state-specific endpoint
  try {
    const michiganUrl = `https://api.congress.gov/v3/member?format=json&fromDateTime=2025-01-01T00:00:00Z&toDateTime=2025-12-31T23:59:59Z&limit=50&api_key=${apiKey}`;
    console.log('Testing with date range for current members...');
    
    const response = await fetch(michiganUrl);
    const data = await response.json();
    
    const michiganMembers = data.members?.filter((m: any) => 
      m.state === 'Michigan' || m.state === 'MI'
    );
    
    tests.tests.push({
      name: 'Date-filtered Members',
      url: michiganUrl.replace(apiKey, 'API_KEY_HIDDEN'),
      status: response.status,
      totalMembers: data.members?.length || 0,
      michiganCount: michiganMembers?.length || 0,
      michiganMembers: michiganMembers?.slice(0, 5).map((m: any) => ({
        name: m.name,
        state: m.state,
        party: m.partyName,
        updateDate: m.updateDate
      }))
    });
  } catch (error: any) {
    tests.tests.push({
      name: 'Date-filtered Members',
      error: error.message
    });
  }

  // Test 4: Try members/current endpoint if it exists
  try {
    const currentMembersUrl = `https://api.congress.gov/v3/member/congress/119/senate/MI?format=json&api_key=${apiKey}`;
    console.log('Testing congress/state specific endpoint...');
    
    const response = await fetch(currentMembersUrl);
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { parseError: true, response: text.substring(0, 200) };
    }
    
    tests.tests.push({
      name: 'Congress/State Specific',
      url: currentMembersUrl.replace(apiKey, 'API_KEY_HIDDEN'),
      status: response.status,
      ok: response.ok,
      data: data
    });
  } catch (error: any) {
    tests.tests.push({
      name: 'Congress/State Specific',
      error: error.message
    });
  }

  // Summary
  tests.summary = {
    totalTests: tests.tests.length,
    passed: tests.tests.filter((t: any) => t.ok || t.status === 200).length,
    failed: tests.tests.filter((t: any) => !t.ok && t.status !== 200).length,
    timestamp: new Date().toISOString(),
    note: 'Congress API returns historical data. Need to filter by dates or use currentMember flag.'
  };

  return NextResponse.json(tests, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
