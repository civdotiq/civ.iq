import { NextRequest, NextResponse } from 'next/server';
import { getDistrictNews } from '@/lib/services/news';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  try {
    const { districtId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    // Parse district ID (format: "TX-02" or "TX-2")
    const [state, districtStr] = districtId.split('-');
    const districtNumber = parseInt(districtStr || '0');

    if (!state || isNaN(districtNumber)) {
      return NextResponse.json(
        { error: 'Invalid district ID format. Expected: STATE-NUMBER (e.g., TX-02)' },
        { status: 400 }
      );
    }

    const news = await getDistrictNews(state, districtNumber, limit);

    return NextResponse.json(news, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    // Log error for debugging in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('District news API error:', error);
    }
    return NextResponse.json({ error: 'Failed to fetch district news' }, { status: 500 });
  }
}
