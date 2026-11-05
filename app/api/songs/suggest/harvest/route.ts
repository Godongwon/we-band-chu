// app/api/songs/suggest/harvest/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { suggestion_id, title, artist, user_youtube_url, action, song_data } = await req.json();

    // 4단계: iTunes 기반 단일 곡 우선 수집 및 미리보기 반환 (action === 'FETCH')
    if (action === 'FETCH') {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&country=KR&media=music&entity=song&limit=5`;
      const res = await fetch(itunesUrl);
      const itunesData = await res.json();
      const match = itunesData.results?.[0];

      const youtubeUrl = user_youtube_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist} ${title}`)}`;

      const previewSong = {
        title: match?.trackName || title,
        artist: match?.artistName || artist,
        genre: match?.primaryGenreName || 'Rock',
        preview_url: match?.previewUrl || null,
        youtube_url: youtubeUrl,
        bpm: null,
        original_key: null,
      };

      return NextResponse.json({ success: true, previewSong });
    }

    // 5 & 6단계: DB 최종 추가 및 밴드 자동 등록 (action === 'CONFIRM')
    if (action === 'CONFIRM' && song_data) {
      // 1) songs 테이블 기본 payload 준비
      const insertPayload: any = {
        title: song_data.title,
        artist: song_data.artist,
        genre: song_data.genre || 'Rock',
        youtube_url: song_data.youtube_url || null,
        bpm: song_data.bpm || null,
        original_key: song_data.original_key || null,
      };

      // preview_url 컬럼이 DB에 있을 때만 삽입 시도 (에러 방어)
      if (song_data.preview_url) {
        insertPayload.preview_url = song_data.preview_url;
      }

      let songErr: any = null;

      // 1차 삽입 시도
      const res1 = await supabase.from('songs').insert([insertPayload]);
      songErr = res1.error;

      // 만약 preview_url 컬럼이 없어서 스키마 에러가 난 경우 preview_url 제외하고 재시도
      if (songErr && songErr.message?.includes('preview_url')) {
        delete insertPayload.preview_url;
        const res2 = await supabase.from('songs').insert([insertPayload]);
        songErr = res2.error;
      }

      if (songErr) throw songErr;

      // 2) 밴드 목록(target_artists)에 없으면 신규 밴드로 자동 등록
      const { data: existingArtist } = await supabase
        .from('target_artists')
        .select('id')
        .eq('name', song_data.artist)
        .maybeSingle();

      let artistAdded = false;
      if (!existingArtist) {
        await supabase
          .from('target_artists')
          .insert([
            {
              name: song_data.artist,
              search_alias: song_data.artist,
              priority: 2,
              is_active: true,
            },
          ]);
        artistAdded = true;
      }

      // 3) 제보 상태를 HARVESTED로 업데이트
      if (suggestion_id) {
        await supabase
          .from('song_suggestions')
          .update({ status: 'HARVESTED' })
          .eq('id', suggestion_id);
      }

      return NextResponse.json({
        success: true,
        message: `'${song_data.title}' 곡이 추가되었습니다.${artistAdded ? ` (${song_data.artist} 밴드 큐 신규 등록됨)` : ''}`,
      });
    }

    return NextResponse.json({ success: false, message: '잘못된 액션 요청입니다.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}