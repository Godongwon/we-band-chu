// app/api/songs/suggest/harvest/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { classifyArtistWithLLM } from '@/lib/artistClassifier';
import {
  analyzePreviewAudio,
  resolveKoreanTrackTitlesByTrackIds,
  formatLocalizedTrackTitle,
} from '@/lib/audioAnalyzer';
import { normalizeGenre } from '@/lib/genreUtils';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { suggestion_id, title, artist, user_youtube_url, action, song_data } = await req.json();

    if (action === 'FETCH') {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&media=music&entity=song&limit=5&lang=ko_kr`;
      const res = await fetch(itunesUrl);
      const itunesData = await res.json();
      const match = itunesData.results?.[0];

      let resolvedTitle = match?.trackName || title;
      if (match?.trackId) {
        const krMap = await resolveKoreanTrackTitlesByTrackIds([match.trackId]);
        const krTitle = krMap.get(Number(match.trackId));
        if (krTitle) {
          resolvedTitle = formatLocalizedTrackTitle(krTitle, resolvedTitle);
        }
      }

      const previewUrl = match?.previewUrl || null;
      let analyzedBpm: number | null = null;
      let analyzedKey: string | null = null;

      if (previewUrl) {
        const analysis = await analyzePreviewAudio(previewUrl, `${artist}-${resolvedTitle}`);
        analyzedBpm = analysis.bpm;
        analyzedKey = analysis.key;
      }

      const youtubeUrl = user_youtube_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist} ${resolvedTitle}`)}`;

      const previewSong = {
        title: resolvedTitle,
        artist: match?.artistName || artist,
        genre: normalizeGenre(match?.primaryGenreName),
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

      // 💡 2) songs 테이블에 이미 동일 곡(artist + title)이 존재하는지 확인
      const { data: duplicateSong } = await supabase
        .from('songs')
        .select('id, title, artist')
        .eq('artist', song_data.artist)
        .eq('title', song_data.title)
        .maybeSingle();

      if (duplicateSong) {
        // 이미 DB에 곡이 존재하는 경우: 중복 INSERT를 피하고 제보 상태만 HARVESTED로 완료 처리
        if (suggestion_id) {
          await supabase
            .from('song_suggestions')
            .update({ status: 'HARVESTED' })
            .eq('id', suggestion_id);
        }

        return NextResponse.json({
          success: true,
          message: `'${song_data.title}'은(는) 이미 DB에 존재하는 곡입니다. 제보 상태를 수집 완료로 갱신했습니다.`,
        });
      }

      // 3) 중복이 없으면 정상 INSERT 진행
      const insertPayload: any = {
        title: song_data.title,
        artist: song_data.artist,
        genre: normalizeGenre(song_data.genre),
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

      // 4) 제보 상태 갱신
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