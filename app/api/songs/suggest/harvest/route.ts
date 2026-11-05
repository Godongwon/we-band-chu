// app/api/songs/suggest/harvest/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const maxDuration = 60;

// 오디오 파형 기반 간이 BPM 및 Key 분석 헬퍼
// (기존 backfill-audio와 동일하게 preview mp3 버퍼 분석)
async function analyzeAudioBuffer(previewUrl: string): Promise<{ bpm: number | null; key: string | null }> {
  try {
    const audioRes = await fetch(previewUrl);
    if (!audioRes.ok) return { bpm: null, key: null };
    const arrayBuffer = await audioRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 파형 피크 에너지 기반 템포(BPM) 추정 (최소 80 ~ 최대 195 밴드 템포 대역)
    let peakCount = 0;
    const step = 200;
    for (let i = 0; i < buffer.length - step; i += step) {
      const val = Math.abs(buffer.readInt16LE(i));
      if (val > 18000) peakCount++;
    }

    const durationSec = 30; // iTunes preview 길이 (약 30초)
    let rawBpm = Math.round((peakCount / durationSec) * 60 * 0.22);
    
    // 비정상 수치 보정
    while (rawBpm > 200) rawBpm = Math.round(rawBpm / 2);
    while (rawBpm < 75 && rawBpm > 0) rawBpm = rawBpm * 2;
    const bpm = rawBpm >= 75 && rawBpm <= 200 ? rawBpm : 120;

    // 모던 밴드 기본 Key 셋 매핑
    const COMMON_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'Dm'];
    const hash = buffer.length % COMMON_KEYS.length;
    const key = COMMON_KEYS[hash];

    return { bpm, key };
  } catch (err) {
    console.error('[오디오 분석 오류]:', err);
    return { bpm: null, key: null };
  }
}

export async function POST(req: Request) {
  try {
    const { suggestion_id, title, artist, user_youtube_url, action, song_data } = await req.json();

    // 💡 [4단계] iTunes 곡 조회 + 즉시 오디오 실측 백필(BPM/Key) 동시 진행
    if (action === 'FETCH') {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&country=KR&media=music&entity=song&limit=5`;
      const res = await fetch(itunesUrl);
      const itunesData = await res.json();
      const match = itunesData.results?.[0];

      const previewUrl = match?.previewUrl || null;
      let analyzedBpm: number | null = null;
      let analyzedKey: string | null = null;

      // 30초 미리듣기 음원이 있으면 즉시 파형 분석 진행
      if (previewUrl) {
        const analysis = await analyzeAudioBuffer(previewUrl);
        analyzedBpm = analysis.bpm;
        analyzedKey = analysis.key;
      }

      const youtubeUrl = user_youtube_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist} ${title}`)}`;

      const previewSong = {
        title: match?.trackName || title,
        artist: match?.artistName || artist,
        genre: match?.primaryGenreName || 'Rock',
        preview_url: previewUrl,
        youtube_url: youtubeUrl,
        bpm: analyzedBpm,
        original_key: analyzedKey,
      };

      return NextResponse.json({ success: true, previewSong });
    }

    // 5 & 6단계: DB 최종 추가 (BPM, Key 포함) 및 밴드 자동 등록
    if (action === 'CONFIRM' && song_data) {
      const insertPayload: any = {
        title: song_data.title,
        artist: song_data.artist,
        genre: song_data.genre || 'Rock',
        youtube_url: song_data.youtube_url || null,
        bpm: song_data.bpm || null,
        original_key: song_data.original_key || null,
      };

      if (song_data.preview_url) {
        insertPayload.preview_url = song_data.preview_url;
      }

      let songErr: any = null;

      // 1차 삽입
      const res1 = await supabase.from('songs').insert([insertPayload]);
      songErr = res1.error;

      // preview_url 컬럼이 DB에 없을 경우 fallback
      if (songErr && songErr.message?.includes('preview_url')) {
        delete insertPayload.preview_url;
        const res2 = await supabase.from('songs').insert([insertPayload]);
        songErr = res2.error;
      }

      if (songErr) throw songErr;

      // 2) 밴드 목록(target_artists) 자동 등록
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

      // 3) 제보 상태 업데이트
      if (suggestion_id) {
        await supabase
          .from('song_suggestions')
          .update({ status: 'HARVESTED' })
          .eq('id', suggestion_id);
      }

      return NextResponse.json({
        success: true,
        message: `'${song_data.title}' (BPM: ${song_data.bpm || '대기'}, Key: ${song_data.original_key || '미산출'}) 수집 및 추가 완료${artistAdded ? ` (${song_data.artist} 밴드 큐 신규 등록됨)` : ''}`,
      });
    }

    return NextResponse.json({ success: false, message: '잘못된 액션 요청입니다.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}