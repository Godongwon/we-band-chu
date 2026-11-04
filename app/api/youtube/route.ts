// app/api/youtube/route.ts
import { NextResponse } from 'next/server';
import ytSearch from 'yt-search';

// 1. 순수 음원이 아닌 영상들의 블랙리스트 키워드
const EXCLUDE_TITLE_REGEX = /(직캠|fancam|무대|교차편집|리액션|reaction|모음|playlist|플레이리스트|1시간|풀버전|full\s*ver|behind|비하인드|티저|teaser|전야제|special\s*clip|live\s*clip|응원법|challenge|챌린지)/i;

// 2. 곡명 정밀 정제 함수
function cleanSongTitle(rawTitle: string, channelArtist: string) {
  let title = rawTitle;
  let artist = channelArtist
    .replace(' - Topic', '')
    .replace('Official', '')
    .trim();

  // "아티스트 - 곡명" 분리
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }

  // 앞단 아티스트명 중복 제거
  const artistRegex = new RegExp(`^${artist}\\s*`, 'gi');
  title = title.replace(artistRegex, '');

  // 따옴표 속 핵심 곡명 우선 추출
  const quoteMatch = title.match(/['"‘“](.*?)['"’”]/);
  if (quoteMatch && quoteMatch[1]?.trim()) {
    title = quoteMatch[1].trim();
  }

  // 불필요한 태그/괄호 정리
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
  const page = parseInt(searchParams.get('page') || '1', 10);

  if (!query || !query.trim()) {
    return NextResponse.json({ items: [] });
  }

  const cleanQuery = query.trim();

  try {
    // 💡 1차: 공식 오디오/음원 성격의 비디오 검색
    const searchResult = await ytSearch(`${cleanQuery} Official Audio`);
    let allVideos = searchResult.videos || [];

    // 결과가 너무 적으면 기본 검색으로 폴백
    if (allVideos.length < 5) {
      const fallbackResult = await ytSearch(`${cleanQuery} 노래`);
      allVideos = [...allVideos, ...(fallbackResult.videos || [])];
    }

    // 💡 핵심: 음원 특성(재생시간 2분~5분 30초 + 블랙리스트 제외) 필터링
    const musicTracksOnly = allVideos.filter((video) => {
      // 1. 재생 시간 검증 (초 단위): 1분 50초(110초) ~ 5분 30초(330초)
      const durationSeconds = video.seconds;
      if (durationSeconds && (durationSeconds < 110 || durationSeconds > 330)) {
        return false;
      }

      // 2. 제목 패턴 검증: 직캠, 무대, 모음집, 챌린지 즉시 차단
      if (EXCLUDE_TITLE_REGEX.test(video.title)) {
        return false;
      }

      return true;
    });

    // 💡 중복 곡명 정리 (한 노래당 가장 적절한 공식 음원 1개만 유지)
    const uniqueItems: any[] = [];
    const seenTitles = new Set<string>();

    for (const video of musicTracksOnly) {
      const { title, artist } = cleanSongTitle(video.title, video.author.name);
      const normalizedTitle = title.replace(/\s+/g, '').toLowerCase();

      if (seenTitles.has(normalizedTitle)) continue;
      seenTitles.add(normalizedTitle);

      uniqueItems.push({
        youtubeId: video.videoId,
        title,
        artist,
        isOfficial: true,
        thumbnail: video.thumbnail,
        youtubeUrl: video.url,
        views: video.views || 0,
        coverSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' 밴드 커버')}`,
      });
    }

    // 페이징 (10곡)
    const pageSize = 10;
    const startIndex = (page - 1) * pageSize;
    const pagedItems = uniqueItems.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < uniqueItems.length;

    // 대중도 기반 커버 활성도 뱃지 계산
    const itemsWithStats = pagedItems.map((item) => {
      let coverLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
      if (item.views >= 1_000_000) coverLevel = 'HIGH';
      else if (item.views < 80_000) coverLevel = 'LOW';

      return {
        ...item,
        coverLevel,
      };
    });

    return NextResponse.json({ items: itemsWithStats, hasMore });
  } catch (error: any) {
    console.error('yt-search Track Filter Error:', error);
    return NextResponse.json({ error: '음원 검색 실패' }, { status: 500 });
  }
}