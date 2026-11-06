// app/api/songs/backfill-audio/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { fetchPreviewUrl, analyzePreviewAudio } from '@/lib/audioAnalyzer';

export const maxDuration = 60;

async function runBackfillBatch() {
  const { data: targetSongs, error: fetchErr } = await supabase
    .from('songs')
    .select('id, title, artist, bpm, original_key, preview_url')
    .or('bpm.is.null,original_key.is.null')
    .limit(10);

  if (fetchErr) throw fetchErr;

  if (!targetSongs || targetSongs.length === 0) {
    return {
      success: true,
      updatedCount: 0,
      remainingCount: 0,
      analyzedSongs: [],
      message: '분석 대기 중인 곡이 없습니다.',
    };
  }

  let updatedCount = 0;
  const analyzedSongs: Array<{
    id: string;
    title: string;
    artist: string;
    bpm: number;
    original_key: string;
  }> = [];

  for (const song of targetSongs) {
    const previewUrl = (song as any).preview_url || (await fetchPreviewUrl(song.title, song.artist));
    const analyzed = await analyzePreviewAudio(previewUrl, `${song.artist}-${song.title}`);

    const detectedBpm = song.bpm || analyzed.bpm;
    const detectedKey = song.original_key || analyzed.key;

    const updatePayload: any = {
      bpm: detectedBpm,
      original_key: detectedKey,
    };
    if (previewUrl && !(song as any).preview_url) {
      updatePayload.preview_url = previewUrl;
    }

    const { error: updateErr } = await supabase
      .from('songs')
      .update(updatePayload)
      .eq('id', song.id);

    if (!updateErr) {
      updatedCount++;
      analyzedSongs.push({
        id: song.id,
        title: song.title,
        artist: song.artist,
        bpm: detectedBpm,
        original_key: detectedKey,
      });
    }
  }

  const { count: remainingCount } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true })
    .or('bpm.is.null,original_key.is.null');

  return {
    success: true,
    updatedCount,
    remainingCount: remainingCount || 0,
    analyzedSongs,
  };
}

export async function GET() {
  try {
    const result = await runBackfillBatch();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[백필 API GET 에러]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || '백필 처리 중 오류 발생' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const result = await runBackfillBatch();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[백필 API POST 에러]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || '백필 처리 중 오류 발생' },
      { status: 500 }
    );
  }
}
