// app/api/songs/sync/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const maxDuration = 60; // Vercel 서버리스 타임아웃 방지

// 비밴드 및 부적합 음원 블랙리스트 키워드
const EXCLUDE_KEYWORDS = [
  'inst', 'instrumental', 'mr', 'ver.', 'version', 'remix',
  'drama', 'ost', 'soundtrack', 'tribute', 'classic', 'orchestra',
  'piano ver', 'acoustic ver', 'live at', 'remaster'
];

export async function GET() {
  try {
    // 1. 수집 우선순위(priority asc) 및 가장 오래전에 수집된(last_harvested_at asc nulls first) 활성 아티스트 1팀 추출
    const { data: targetArtists, error: artistErr } = await supabase
      .from('target_artists')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .order('last_harvested_at', { ascending: true, nullsFirst: true })
      .limit(1);

    if (artistErr) throw artistErr;
    if (!targetArtists || targetArtists.length === 0) {
      return NextResponse.json({ success: true, message: '수집할 활성 아티스트가 없습니다.' });
    }

    const currentArtist = targetArtists[0];
    const searchTerm = currentArtist.search_alias || currentArtist.name;

    // 2. iTunes Search API 호출 (한국 스토어, 최대 50곡 조회)
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&country=KR&media=music&entity=song&limit=50`;
    const itunesRes = await fetch(itunesUrl);
    if (!itunesRes.ok) {
      throw new Error(`iTunes API 응답 실패: HTTP ${itunesRes.status}`);
    }

    const itunesData = await itunesRes.json();
    const rawTracks = itunesData.results || [];

    // 3. 비밴드 음원 및 외주/Inst 필터링
    const validTracks = rawTracks.filter((track: any) => {
      const titleLower = (track.trackName || '').toLowerCase();
      const genreLower = (track.primaryGenreName || '').toLowerCase();

      // (1) 부적합 장르 배제
      if (['classical', 'dance', 'electronic', 'hip-hop/rap', 'children\'s music'].includes(genreLower)) {
        return false;
      }

      // (2) 블랙리스트 키워드 검사
      const hasBlacklist = EXCLUDE_KEYWORDS.some((kw) => titleLower.includes(kw));
      if (hasBlacklist) return false;

      // (3) 30초 오디오 미리듣기 프리뷰가 있어야 BPM/Key 분석 가능
      return !!track.previewUrl;
    });

    // 4. DB 중복 방지 (기존 songs 테이블에 이미 등록된 곡 제목 확인)
    const { data: existingSongs } = await supabase
      .from('songs')
      .select('title')
      .eq('artist', currentArtist.name);

    const existingTitles = new Set((existingSongs || []).map((s: any) => s.title.toLowerCase().trim()));

    const newSongsToInsert: any[] = [];

    for (const track of validTracks) {
      const cleanTitle = track.trackName.trim();
      if (existingTitles.has(cleanTitle.toLowerCase())) continue;

      // 더미/실측 데이터 산출 (기본값 구성 및 YouTube 검색 링크 생성)
      const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${currentArtist.name} ${cleanTitle}`)}`;

      newSongsToInsert.push({
        title: cleanTitle,
        artist: currentArtist.name,
        genre: track.primaryGenreName || 'Rock',
        preview_url: track.previewUrl,
        youtube_url: youtubeUrl,
        live_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${currentArtist.name} ${cleanTitle} 라이브`)}`,
        cover_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${currentArtist.name} ${cleanTitle} 밴드 커버`)}`,
        bpm: null, // 백필 또는 분석 워커에서 실측
        original_key: null,
      });

      existingTitles.add(cleanTitle.toLowerCase());
      if (newSongsToInsert.length >= 20) break; // 1회 수집 시 최대 20곡 안전 적재
    }

    // 5. 신규 곡 songs 테이블에 INSERT
    let insertedCount = 0;
    if (newSongsToInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from('songs')
        .insert(newSongsToInsert);

      if (insertErr) throw insertErr;
      insertedCount = newSongsToInsert.length;
    }

    // 6. 💡 핵심: 대상 아티스트의 last_harvested_at을 현재 UTC 시간으로 반드시 업데이트
    const nowIso = new Date().toISOString();
    await supabase
      .from('target_artists')
      .update({ last_harvested_at: nowIso })
      .eq('id', currentArtist.id);

    return NextResponse.json({
      success: true,
      message: `${currentArtist.name} 수집 완료 (${insertedCount}곡 추가)`,
      lastExecution: {
        artist: currentArtist.name,
        count: insertedCount,
        time: nowIso,
      },
    });
  } catch (error: any) {
    console.error('[API /api/songs/sync Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}