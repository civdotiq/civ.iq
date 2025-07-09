/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { NextRequest, NextResponse } from 'next/server';
import { structuredLogger } from '@/lib/logging/logger';

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

  // Test 1: Basic API connection
  try {
    const basicUrl = `https://api.congress.gov/v3/member?format=json&limit=1&api_key=${apiKey}`;
    structuredLogger.info('Testing basic Congress API connection', {
      operation: 'debug_congress_basic_connection',
      url: basicUrl.replace(apiKey, 'API_KEY_HIDDEN')
    }, request);
    
    const response = await fetch(basicUrl);
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { parseError: true, responseText: text.substring(0, 500) };
    }
    
    tests.tests.push({
      name: 'Basic API Connection',
      url: basicUrl.replace(apiKey, 'API_KEY_HIDDEN'),
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      data: data
    });
  } catch (error: any) {
    tests.tests.push({
      name: 'Basic API Connection',
      error: error.message
    });
  }

  // Test 2: 119th Congress members
  try {
    const congress119Url = `https://api.congress.gov/v3/member?format=json&limit=10&congress=119&api_key=${apiKey}`;
    structuredLogger.info('Testing 119th Congress members', {
      operation: 'debug_congress_119th_members',
      congress: '119',
      url: congress119Url.replace(apiKey, 'API_KEY_HIDDEN')
    }, request);
    
    const response = await fetch(congress119Url);
    const data = await response.json();
    
    tests.tests.push({
      name: '119th Congress Members',
      url: congress119Url.replace(apiKey, 'API_KEY_HIDDEN'),
      status: response.status,
      ok: response.ok,
      memberCount: data.members?.length || 0,
      pagination: data.pagination,
      firstMember: data.members?.[0] ? {
        name: data.members[0].name,
        state: data.members[0].state,
        party: data.members[0].partyName,
        bioguideId: data.members[0].bioguideId
      } : null
    });
  } catch (error: any) {
    tests.tests.push({
      name: '119th Congress Members',
      error: error.message
    });
  }

  // Test 3: 118th Congress members (for comparison)
  try {
    const congress118Url = `https://api.congress.gov/v3/member?format=json&limit=10&congress=118&api_key=${apiKey}`;
    structuredLogger.info('Testing 118th Congress members for comparison', {
      operation: 'debug_congress_118th_members',
      congress: '118',
      url: congress118Url.replace(apiKey, 'API_KEY_HIDDEN')
    }, request);
    
    const response = await fetch(congress118Url);
    const data = await response.json();
    
    tests.tests.push({
      name: '118th Congress Members (comparison)',
      url: congress118Url.replace(apiKey, 'API_KEY_HIDDEN'),
      status: response.status,
      ok: response.ok,
      memberCount: data.members?.length || 0,
      pagination: data.pagination,
      firstMember: data.members?.[0] ? {
        name: data.members[0].name,
        state: data.members[0].state,
        party: data.members[0].partyName,
        bioguideId: data.members[0].bioguideId
      } : null
    });
  } catch (error: any) {
    tests.tests.push({
      name: '118th Congress Members (comparison)',
      error: error.message
    });
  }

  // Test 4: Michigan representatives specifically
  try {
    // First get all members, then filter by Michigan
    const allMembersUrl = `https://api.congress.gov/v3/member?format=json&limit=250&congress=119&api_key=${apiKey}`;
    structuredLogger.info('Fetching members to find Michigan representatives', {
      operation: 'debug_congress_michigan_filter',
      state: 'Michigan',
      url: allMembersUrl.replace(apiKey, 'API_KEY_HIDDEN')
    }, request);
    
    const response = await fetch(allMembersUrl);
    const data = await response.json();
    
    const michiganMembers = data.members?.filter((member: any) => 
      member.state === 'Michigan' || member.state === 'MI'
    ) || [];
    
    tests.tests.push({
      name: 'Michigan Representatives in 119th',
      url: allMembersUrl.replace(apiKey, 'API_KEY_HIDDEN'),
      status: response.status,
      totalMembers: data.members?.length || 0,
      michiganMemberCount: michiganMembers.length,
      michiganMembers: michiganMembers.map((m: any) => ({
        name: m.name,
        state: m.state,
        party: m.partyName,
        bioguideId: m.bioguideId,
        terms: m.terms?.item?.length || 0
      }))
    });
  } catch (error: any) {
    tests.tests.push({
      name: 'Michigan Representatives',
      error: error.message
    });
  }

  // Test 5: Current members endpoint
  try {
    const currentUrl = `https://api.congress.gov/v3/member?format=json&limit=10&currentMember=true&api_key=${apiKey}`;
    structuredLogger.info('Testing current members endpoint', {
      operation: 'debug_congress_current_members',
      url: currentUrl.replace(apiKey, 'API_KEY_HIDDEN')
    }, request);
    
    const response = await fetch(currentUrl);
    const data = await response.json();
    
    tests.tests.push({
      name: 'Current Members Endpoint',
      url: currentUrl.replace(apiKey, 'API_KEY_HIDDEN'),
      status: response.status,
      ok: response.ok,
      memberCount: data.members?.length || 0,
      note: 'Testing if currentMember=true works'
    });
  } catch (error: any) {
    tests.tests.push({
      name: 'Current Members Endpoint',
      error: error.message
    });
  }

  // Summary
  tests.summary = {
    totalTests: tests.tests.length,
    passed: tests.tests.filter((t: any) => t.ok || t.status === 200).length,
    failed: tests.tests.filter((t: any) => !t.ok && t.status !== 200).length,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(tests, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
