// app/api/youtube/route.ts
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (!query) {
      return NextResponse.json({ items: [], hasMore: false });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    // 1. YouTube Data API v3 사용
    if (apiKey) {
      const maxResults = 5;
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        query + ' 음원 Audio'
      )}&maxResults=${maxResults}&type=video&key=${apiKey}`;

      try {
        const res = await fetch(searchUrl, {
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const items = data.items.map((item: any) => ({
              youtubeId: item.id?.videoId,
              title: item.snippet?.title || query,
              artist: item.snippet?.channelTitle || '',
              thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
              youtubeUrl: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
              coverSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
                query + ' 밴드 커버 TAB cover'
              )}`,
              coverLevel: 'NORMAL',
            }));

            return NextResponse.json({ items, hasMore: false });
          }
        } else {
          console.warn('[유튜브 API 응답 오류 HTTP]:', res.status);
        }
      } catch (ytApiErr: any) {
        console.warn('[유튜브 API 호출 예외]:', ytApiErr.message);
      }
    }

    // 2. API Key가 없거나 쿼터가 소진된 경우 더미/검색 링크 안전 반환
    const fallbackItem = {
      youtubeId: `search-${Date.now()}`,
      title: query,
      artist: '공식 음원',
      thumbnail: '',
      youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      coverSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
        query + ' 밴드 커버 TAB cover'
      )}`,
      coverLevel: 'NORMAL',
    };

    return NextResponse.json({
      items: [fallbackItem],
      hasMore: false,
    });
  } catch (error: any) {
    console.error('[유튜브 라우트 치명적 에러]:', error.message);
    // 500을 뱉지 않고 빈 리스트를 반환하여 클라이언트 에러 방지
    return NextResponse.json({ items: [], hasMore: false }, { status: 200 });
  }
}