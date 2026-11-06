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

      // 사용자가 한글로 제보했으나 iTunes에서 영문 곡명만 반환한 경우, 한글 제보명 병기
      const cleanUserTitle = String(title || '').trim();
      if (cleanUserTitle && /[가-힣]/.test(cleanUserTitle) && !resolvedTitle.includes(cleanUserTitle)) {
        resolvedTitle = `${cleanUserTitle} (${resolvedTitle})`;
      }

      // 아티스트명도 사용자가 한글로 제보했으나 iTunes가 영문(예: SOYEON)으로 반환한 경우, 사용자가 제보한 한글명 우선 채택
      const cleanUserArtist = String(artist || '').trim();
      let resolvedArtist = match?.artistName || artist;
      if (cleanUserArtist && /[가-힣]/.test(cleanUserArtist) && !resolvedArtist.includes(cleanUserArtist)) {
        resolvedArtist = cleanUserArtist;
      }

      const previewUrl = match?.previewUrl || null;
      let analyzedBpm: number | null = null;
      let analyzedKey: string | null = null;

      if (previewUrl) {
        const analysis = await analyzePreviewAudio(previewUrl, `${resolvedArtist}-${resolvedTitle}`);
        analyzedBpm = analysis.bpm;
        analyzedKey = analysis.key;
      }

      const youtubeUrl = user_youtube_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${resolvedArtist} ${resolvedTitle}`)}`;

      const previewSong = {
        title: resolvedTitle,
        artist: resolvedArtist,
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

        const aliases = new Set<string>();
        if (classified.search_alias) {
          classified.search_alias.split(',').forEach((a: string) => aliases.add(a.trim()));
        }
        if (song_data.artist) aliases.add(song_data.artist.trim());
        if (artist) aliases.add(String(artist).trim());

        await supabase.from('target_artists').insert([
          {
            name: song_data.artist,
            search_alias: Array.from(aliases).filter(Boolean).join(', '),
            vocal_gender: classified.vocal_gender,
            priority: 2,
            is_active: true,
          },
        ]);
      }

      const cleanArtist = String(song_data.artist || '').trim();
      const cleanTitle = String(song_data.title || '').trim();

      // 💡 2) songs 테이블에 이미 동일 곡(artist + title)이 존재하는지 확인 (대소문자/공백 무시 ilike)
      const { data: duplicateSong } = await supabase
        .from('songs')
        .select('id, title, artist')
        .ilike('artist', cleanArtist)
        .ilike('title', cleanTitle)
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
          message: `'${cleanTitle}'은(는) 이미 DB에 존재하는 곡입니다. 제보 상태를 '수집 완료'로 갱신했습니다.`,
        });
      }

      // 3) 중복이 없으면 정상 INSERT 진행
      const insertPayload: any = {
        title: cleanTitle,
        artist: cleanArtist,
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

      // 💡 만약 DB의 UNIQUE 제약조건(songs_artist_title_key)에 의해 중복 감지된 경우: 실패가 아니라 정상 수집 완료로 흡수 처리
      if (songErr) {
        if (
          songErr.code === '23505' ||
          songErr.message?.includes('songs_artist_title_key') ||
          songErr.message?.includes('duplicate key')
        ) {
          if (suggestion_id) {
            await supabase
              .from('song_suggestions')
              .update({ status: 'HARVESTED' })
              .eq('id', suggestion_id);
          }
          return NextResponse.json({
            success: true,
            message: `'${cleanTitle}'은(는) 이미 DB에 등록되어 있는 곡입니다. 제보 상태를 '수집 완료'로 갱신했습니다.`,
          });
        }
        throw songErr;
      }

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
    console.error('[제보 음원 수집 처리 오류]:', err);
    let errorMessage = err.message || '제보 곡 처리 중 오류가 발생했습니다.';
    if (err.code === '23505' || err.message?.includes('songs_artist_title_key')) {
      errorMessage = '이미 동일한 아티스트의 동일 곡명이 DB에 등록되어 있습니다.';
    }
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}