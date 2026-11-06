// app/api/songs/report/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { song_id, title, artist, reason } = body;

    console.log('[신고 접수 시도]:', { song_id, title, artist, reason });

    if (!title || !artist) {
      return NextResponse.json(
        { success: false, message: '곡명과 아티스트명이 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 1. song_id가 전달되었더라도 실제 songs 테이블에 존재하는지 확인 (외래키 제약조건 위반 방지)
    let finalSongId: string | null = null;

    if (song_id && typeof song_id === 'string' && song_id.length > 10) {
      const { data: verifiedSong } = await supabase
        .from('songs')
        .select('id')
        .eq('id', song_id)
        .maybeSingle();

      if (verifiedSong?.id) {
        finalSongId = verifiedSong.id;
      }
    }

    // 전달된 song_id가 실제 DB에 없거나 비어 있는 경우, title과 artist로 실제 song_id 조회
    if (!finalSongId) {
      let query = supabase.from('songs').select('id').ilike('title', title.trim());
      if (artist?.trim()) {
        query = query.ilike('artist', artist.trim());
      }
      const { data: matchedSong } = await query.limit(1).maybeSingle();

      if (matchedSong?.id) {
        finalSongId = matchedSong.id;
      } else {
        // artist 없이 title로만 재시도
        const { data: fallbackSong } = await supabase
          .from('songs')
          .select('id')
          .ilike('title', title.trim())
          .limit(1)
          .maybeSingle();

        if (fallbackSong?.id) {
          finalSongId = fallbackSong.id;
        }
      }
    }

    // 2. song_reports 테이블에 INSERT
    const insertPayload: any = {
      title: title.trim(),
      artist: artist.trim(),
      reason: reason?.trim() || '비밴드 곡 또는 잘못된 음원 정보',
      status: 'PENDING',
      song_id: finalSongId || null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('song_reports')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error('[신고 DB 저장 에러]:', insertError.message);
      return NextResponse.json(
        { success: false, message: `DB 저장 에러: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log('[신고 접수 성공]:', inserted);

    return NextResponse.json({
      success: true,
      message: '신고가 정상 접수되었습니다.',
      data: inserted,
    });
  } catch (error: any) {
    console.error('[신고 처리 서버 예외]:', error.message);
    return NextResponse.json(
      { success: false, message: error.message || '서버 처리 오류' },
      { status: 500 }
    );
  }
}