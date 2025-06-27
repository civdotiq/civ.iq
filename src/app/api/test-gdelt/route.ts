import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'Gary Peters Michigan Senator';
  
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=artlist&maxrecords=10&format=json&sort=datedesc`;
    
    console.log('Testing GDELT with URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    
    console.log('GDELT Response status:', response.status);
    console.log('GDELT Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('GDELT Response text (first 500 chars):', text.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return NextResponse.json({
        error: 'Failed to parse GDELT response',
        responseText: text.substring(0, 1000),
        status: response.status
      });
    }
    
    return NextResponse.json({
      success: true,
      query,
      url,
      articlesFound: data.articles?.length || 0,
      articles: data.articles?.slice(0, 5) || [],
      rawResponse: data
    });
    
  } catch (error) {
    console.error('GDELT Test Error:', error);
    return NextResponse.json({
      error: error.message,
      query,
      stack: error.stack
    });
  }
}