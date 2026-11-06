// app/api/songs/backfill-audio/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { fetchPreviewUrl, analyzePreviewAudio } from '@/lib/audioAnalyzer';

export const maxDuration = 60;

async function runBackfillBatch(isForceAll = false, offset = 0, batchSize = 10) {
  let query = supabase
    .from('songs')
    .select('id, title, artist, bpm, original_key, preview_url');

  if (!isForceAll) {
    query = query.or('bpm.is.null,original_key.is.null');
  }

  const { data: targetSongs, error: fetchErr } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + batchSize - 1);

  if (fetchErr) throw fetchErr;

  if (!targetSongs || targetSongs.length === 0) {
    return {
      success: true,
      updatedCount: 0,
      remainingCount: 0,
      hasMore: false,
      analyzedSongs: [],
      message: '분석 대상 곡이 없습니다.',
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

    const detectedBpm = isForceAll ? (analyzed.bpm || song.bpm || 120) : (song.bpm || analyzed.bpm);
    const detectedKey = isForceAll ? (analyzed.key || song.original_key || 'C') : (song.original_key || analyzed.key);

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

  const { count: totalSongsCount } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true });

  const nextOffset = offset + targetSongs.length;
  const hasMore = isForceAll
    ? nextOffset < (totalSongsCount || 0)
    : targetSongs.length === batchSize;

  return {
    success: true,
    updatedCount,
    offset,
    nextOffset,
    totalSongsCount: totalSongsCount || 0,
    hasMore,
    analyzedSongs,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isForceAll = searchParams.get('force') === 'true';
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const batchSize = Math.max(1, Math.min(20, parseInt(searchParams.get('batchSize') || '10', 10)));
    const result = await runBackfillBatch(isForceAll, offset, batchSize);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[백필 API GET 에러]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || '백필 처리 중 오류 발생' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    let isForceAll = false;
    let offset = 0;
    let batchSize = 10;
    let songIds: string[] | null = null;
    try {
      const body = await req.json();
      if (body?.force !== undefined) isForceAll = Boolean(body.force);
      if (body?.offset !== undefined) offset = Math.max(0, Number(body.offset));
      if (body?.batchSize !== undefined) batchSize = Math.max(1, Math.min(20, Number(body.batchSize)));
      if (Array.isArray(body?.songIds)) songIds = body.songIds;
    } catch {
      // Body 없는 경우 기본값
    }

    if (songIds && songIds.length > 0) {
      const { data: targetSongs, error: fetchErr } = await supabase
        .from('songs')
        .select('id, title, artist, bpm, original_key, preview_url')
        .in('id', songIds.slice(0, 20));

      if (fetchErr) throw fetchErr;

      let updatedCount = 0;
      const analyzedSongs: any[] = [];

      for (const song of targetSongs || []) {
        const previewUrl = song.preview_url || (await fetchPreviewUrl(song.title, song.artist));
        const analyzed = await analyzePreviewAudio(previewUrl, `${song.artist}-${song.title}`);

        const detectedBpm = analyzed.bpm || song.bpm || 120;
        const detectedKey = analyzed.key || song.original_key || 'C';

        const updatePayload: any = {
          bpm: detectedBpm,
          original_key: detectedKey,
        };
        if (previewUrl && !song.preview_url) {
          updatePayload.preview_url = previewUrl;
        }

        const { error: updErr } = await supabase
          .from('songs')
          .update(updatePayload)
          .eq('id', song.id);

        if (!updErr) {
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

      return NextResponse.json({
        success: true,
        updatedCount,
        analyzedSongs,
      });
    }

    const result = await runBackfillBatch(isForceAll, offset, batchSize);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[백필 API POST 에러]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || '백필 처리 중 오류 발생' },
      { status: 500 }
    );
  }
}
