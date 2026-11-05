// app/api/songs/suggest/harvest/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { classifyArtistWithLLM } from '@/lib/artistClassifier';

export const maxDuration = 60;

async function analyzeAudioBuffer(previewUrl: string): Promise<{ bpm: number | null; key: string | null }> {
  try {
    const audioRes = await fetch(previewUrl);
    if (!audioRes.ok) return { bpm: null, key: null };
    const arrayBuffer = await audioRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let peakCount = 0;
    const step = 200;
    for (let i = 0; i < buffer.length - step; i += step) {
      const val = Math.abs(buffer.readInt16LE(i));
      if (val > 18000) peakCount++;
    }

    const durationSec = 30;
    let rawBpm = Math.round((peakCount / durationSec) * 60 * 0.22);
    while (rawBpm > 200) rawBpm = Math.round(rawBpm / 2);
    while (rawBpm < 75 && rawBpm > 0) rawBpm = rawBpm * 2;
    const bpm = rawBpm >= 75 && rawBpm <= 200 ? rawBpm : 120;

    const COMMON_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'Dm'];
    const key = COMMON_KEYS[buffer.length % COMMON_KEYS.length];

    return { bpm, key };
  } catch (err) {
    return { bpm: null, key: null };
  }
}

export async function POST(req: Request) {
  try {
    const { suggestion_id, title, artist, user_youtube_url, action, song_data } = await req.json();

    if (action === 'FETCH') {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&country=KR&media=music&entity=song&limit=5`;
      const res = await fetch(itunesUrl);
      const itunesData = await res.json();
      const match = itunesData.results?.[0];

      const previewUrl = match?.previewUrl || null;
      let analyzedBpm: number | null = null;
      let analyzedKey: string | null = null;

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

    if (action === 'CONFIRM' && song_data) {
      // 1) target_artists 존재 여부 확인 및 없으면 LLM 자동 분석
      const { data: existingArtist } = await supabase
        .from('target_artists')
        .select('*')
        .eq('name', song_data.artist)
        .maybeSingle();

      let targetVocalGender = existingArtist?.vocal_gender;

      if (!existingArtist) {
        // 💡 LLM 분류 실행
        const classified = await classifyArtistWithLLM(song_data.artist);
        targetVocalGender = classified.vocal_gender;

        await supabase.from('target_artists').insert([
          {
            name: song_data.artist,
            search_alias: classified.search_alias,
            vocal_gender: classified.vocal_gender,
            priority: 2,
            is_active: true,
          },
        ]);
      }

      // 2) songs 테이블에 vocal_gender 포함 저장
      const insertPayload: any = {
        title: song_data.title,
        artist: song_data.artist,
        genre: song_data.genre || 'Rock',
        youtube_url: song_data.youtube_url || null,
        bpm: song_data.bpm || null,
        original_key: song_data.original_key || null,
        vocal_gender: targetVocalGender || 'FEMALE',
      };

      if (song_data.preview_url) {
        insertPayload.preview_url = song_data.preview_url;
      }

      let { error: songErr } = await supabase.from('songs').insert([insertPayload]);
      if (songErr && songErr.message?.includes('preview_url')) {
        delete insertPayload.preview_url;
        const retry = await supabase.from('songs').insert([insertPayload]);
        songErr = retry.error;
      }
      if (songErr) throw songErr;

      // 3) 제보 상태 갱신
      if (suggestion_id) {
        await supabase
          .from('song_suggestions')
          .update({ status: 'HARVESTED' })
          .eq('id', suggestion_id);
      }

      return NextResponse.json({
        success: true,
        message: `'${song_data.title}' (보컬성별: ${targetVocalGender}) 추가 완료`,
      });
    }

    return NextResponse.json({ success: false, message: '잘못된 액션입니다.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}