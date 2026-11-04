// app/api/recommend/route.ts
import { NextResponse } from 'next/server';
import { runBandRecommendation, getDbFallbackSongs } from '@/lib/recommendEngine';

export async function POST(req: Request) {
  let excludeTitles: string[] = [];
  let category = 'ALL';

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (Array.isArray(body.excludeTitles)) {
      excludeTitles = body.excludeTitles;
    }
    if (body.category) {
      category = body.category;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

    const recommendations = await runBandRecommendation({
      bandProfile: body.bandProfile,
      repertoireSongs: body.repertoireSongs,
      category,
      excludeTitles,
      apiKey,
    });

    return NextResponse.json({ recommendations: recommendations || [] }, { status: 200 });
  } catch (error: any) {
    console.error('[Recommend API Route Error]:', error);
    try {
      // 💡 첫 번째 인자로 category('ALL' 등)를 전달하도록 수정
      const fallback = await getDbFallbackSongs(category, excludeTitles, 10);
      return NextResponse.json({ recommendations: fallback || [] }, { status: 200 });
    } catch {
      return NextResponse.json({ recommendations: [] }, { status: 200 });
    }
  }
}