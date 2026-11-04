// app/api/youtube/route.ts
import { NextResponse } from 'next/server';

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanSongTitle(rawTitle: string, channelArtist: string): { title: string; artist: string } {
  let title = decodeHtmlEntities(rawTitle);
  let artist = decodeHtmlEntities(channelArtist).replace(' - Topic', '').replace('Official', '').trim();

  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }

  const artistRegex = new RegExp(`^${artist}\\s*`, 'gi');
  title = title.replace(artistRegex, '');

  const quoteMatch = title.match(/['"‘“](.*?)['"’”]/);
  if (quoteMatch && quoteMatch[1]?.trim()) {
    title = quoteMatch[1].trim();
  }

  title = title
    .replace(/\(.*?\)|\[.*?\]/gi, '')
    .replace(/official\s*(mv|music\s*video|audio|video)/gi, '')
    .replace(/m\/v/gi, '')
    .replace(/['"‘“’”]/g, '')
    .trim();

  return { title: title || rawTitle, artist };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const pageToken = searchParams.get('pageToken') || '';

  if (!query || !query.trim()) {
    return NextResponse.json({ items: [] });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'YOUTUBE_API_KEY 환경변수가 로드되지 않았습니다. .env.local을 확인하세요.' },
      { status: 500 }
    );
  }

  try {
    // 검색어가 정확히 검색되도록 순수 query 기반 검색 진행
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      query.trim()
    )}&type=video&videoCategoryId=10&maxResults=10&key=${apiKey}`;

    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (data.error) {
      console.error('YouTube API Raw Error:', data.error);
      return NextResponse.json({ error: data.error.message }, { status: data.error.code || 500 });
    }

    const items = (data.items || []).map((item: any) => {
      const { title, artist } = cleanSongTitle(item.snippet.title, item.snippet.channelTitle);

      return {
        youtubeId: item.id.videoId,
        title,
        artist,
        isOfficial: item.snippet.channelTitle.includes(' - Topic'),
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        coverSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' 밴드 커버')}`,
      };
    });

    return NextResponse.json({ items, nextPageToken: data.nextPageToken || null });
  } catch (error: any) {
    console.error('YouTube Route Exception:', error);
    return NextResponse.json({ error: error.message || '서버 내부 오류' }, { status: 500 });
  }
}