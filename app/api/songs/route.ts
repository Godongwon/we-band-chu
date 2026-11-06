// app/api/songs/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

function normalizeForSearch(str?: string | null): string {
  return (str || '').toLowerCase().replace(/\s+/g, '');
}

function toCharWildcard(str: string): string {
  const clean = str.replace(/[,()*%_'\\]/g, '').replace(/\s+/g, '');
  if (!clean) return '';
  return `%${Array.from(clean.slice(0, 24)).join('%')}%`;
}

// ========================================================
// 1. 음원 목록 및 단건 조회 (공백·대소문자 무시 통합 검색 지원)
// ========================================================
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    const limit = parseInt(searchParams.get('limit') || '2000', 10);
    const id = searchParams.get('id');
    const q = searchParams.get('q')?.trim();

    if (id) {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ song: data });
    }

    let queryBuilder = supabase
      .from('songs')
      .select('id, title, artist, genre, bpm, original_key, vocal_gender, youtube_url, created_at')
      .order('created_at', { ascending: false });

    if (!q) {
      const { data: songs, error } = await queryBuilder.limit(limit);
      if (error) {
        console.error('[API /api/songs GET Error]:', error.message);
        throw error;
      }
      return NextResponse.json({ songs: songs || [] });
    }

    const normQ = normalizeForSearch(q);
    if (!normQ) {
      return NextResponse.json({ songs: [] });
    }

    // 아티스트 영문/한글 별칭(search_alias)도 공백·대소문자 무시하여 매칭
    const matchedArtistNormSet = new Set<string>();
    const orParts: string[] = [];

    const fullWildcard = toCharWildcard(q);
    if (fullWildcard) {
      orParts.push(`title.ilike.${fullWildcard}`, `artist.ilike.${fullWildcard}`);
    }

    const tokens = q
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/\s+/g, ''))
      .filter(Boolean);

    if (tokens.length > 1) {
      for (const tk of tokens.slice(0, 3)) {
        const tkWild = toCharWildcard(tk);
        if (tkWild) {
          orParts.push(`title.ilike.${tkWild}`, `artist.ilike.${tkWild}`);
        }
      }
    }

    const { data: artistRows } = await supabase
      .from('target_artists')
      .select('name, search_alias');

    for (const a of artistRows || []) {
      const normName = normalizeForSearch(a.name);
      const normAlias = normalizeForSearch(a.search_alias);
      if (
        (normName && (normName.includes(normQ) || normQ.includes(normName))) ||
        (normAlias && (normAlias.includes(normQ) || normQ.includes(normAlias)))
      ) {
        if (normName) matchedArtistNormSet.add(normName);
        const safeArtist = (a.name || '').replace(/[,()*%_'\\]/g, '').trim();
        if (safeArtist && orParts.length < 16) {
          orParts.push(`artist.ilike.%${safeArtist}%`);
        }
      }
    }

    if (orParts.length > 0) {
      queryBuilder = queryBuilder.or(Array.from(new Set(orParts)).join(','));
    }

    const fetchLimit = Math.max(limit * 6, 1200);
    const { data: candidateSongs, error } = await queryBuilder.limit(fetchLimit);

    if (error) {
      console.error('[API /api/songs GET Error]:', error.message);
      throw error;
    }

    const filteredSongs = (candidateSongs || [])
      .filter((s: any) => {
        const normTitle = normalizeForSearch(s.title);
        const normArtist = normalizeForSearch(s.artist);
        const combined1 = `${normTitle}${normArtist}`;
        const combined2 = `${normArtist}${normTitle}`;

        if (
          normTitle.includes(normQ) ||
          normArtist.includes(normQ) ||
          combined1.includes(normQ) ||
          combined2.includes(normQ)
        ) {
          return true;
        }

        if (matchedArtistNormSet.has(normArtist)) {
          return true;
        }

        if (tokens.length > 1) {
          return tokens.every(
            (tk) =>
              normTitle.includes(tk) ||
              normArtist.includes(tk) ||
              matchedArtistNormSet.has(normArtist)
          );
        }

        return false;
      })
      .slice(0, limit);

    return NextResponse.json({ songs: filteredSongs });
  } catch (error: any) {
    console.error('[API /api/songs Server Error]:', error.message);
    return NextResponse.json({ error: error.message, songs: [] }, { status: 500 });
  }
}

// ========================================================
// 2. 음원 단건 및 다중 선택 삭제
// ========================================================
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    let ids: string[] = [];

    try {
      const body = await req.json();
      if (body.ids && Array.isArray(body.ids)) {
        ids = body.ids;
      } else if (body.id) {
        id = body.id;
      }
    } catch {
      // Body가 없는 쿼리스트링 요청 대응
    }

    if (id) {
      ids.push(id);
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, message: '삭제할 곡의 ID가 전달되지 않았습니다.' },
        { status: 400 }
      );
    }

    const chunkSize = 50;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error } = await supabase.from('songs').delete().in('id', chunk);
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: `총 ${ids.length}곡이 성공적으로 삭제되었습니다.`,
      deletedCount: ids.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || '삭제 처리 중 오류 발생' },
      { status: 500 }
    );
  }
}

// ========================================================
// 3. 음원 제목 등 단건 정보 수정 (PATCH)
// ========================================================
export async function PATCH(req: Request) {
  try {
    const { id, title, artist } = await req.json();
    if (!id || !title || !String(title).trim()) {
      return NextResponse.json(
        { success: false, message: '곡 ID와 수정할 곡명이 필요합니다.' },
        { status: 400 }
      );
    }

    const cleanTitle = String(title).trim();
    const updatePayload: any = { title: cleanTitle };
    if (artist) {
      updatePayload.youtube_url = `https://www.youtube.com/results?search_query=${encodeURIComponent(
        `${artist} ${cleanTitle}`
      )}`;
    }

    const { data, error } = await supabase
      .from('songs')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `곡명이 '${cleanTitle}'(으)로 수정되었습니다.`,
      song: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || '곡명 수정 중 오류 발생' },
      { status: 500 }
    );
  }
}