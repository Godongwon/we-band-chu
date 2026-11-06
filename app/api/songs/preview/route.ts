// app/api/songs/preview/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { fetchPreviewUrl, searchITunesTracksForArtist } from '@/lib/audioAnalyzer';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const songId = searchParams.get('id');
    const title = searchParams.get('title')?.trim() || '';
    const artist = searchParams.get('artist')?.trim() || '';

    if (songId) {
      const { data: song } = await supabase
        .from('songs')
        .select('id, title, artist, preview_url')
        .eq('id', songId)
        .maybeSingle();

      if (song?.preview_url) {
        return NextResponse.json({ success: true, preview_url: song.preview_url });
      }
    }

    if (!title) {
      return NextResponse.json(
        { success: false, message: '곡 제목이 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. fetchPreviewUrl 직접 탐색
    let previewUrl = await fetchPreviewUrl(title, artist);

    // 2. 만약 없으면 아티스트 기반 검색 결과에서 매칭
    if (!previewUrl && artist) {
      const tracks = await searchITunesTracksForArtist(artist, null);
      const normTitle = title.toLowerCase().replace(/[^a-z0-9가-힣ぁ-んァ-ヶ一-龯]/g, '');

      const matched = tracks.find((t) => {
        if (!t.previewUrl) return false;
        const trackNorm = (t.trackName || '')
          .toLowerCase()
          .replace(/[^a-z0-9가-힣ぁ-んァ-ヶ一-龯]/g, '');
        return (
          trackNorm === normTitle ||
          trackNorm.includes(normTitle) ||
          normTitle.includes(trackNorm)
        );
      });

      previewUrl = matched?.previewUrl || tracks.find((t) => t.previewUrl)?.previewUrl || null;
    }

    if (previewUrl && songId) {
      // 찾은 preview_url을 DB에 저장하여 다음부터는 즉시 재생되도록 최적화
      await supabase
        .from('songs')
        .update({ preview_url: previewUrl })
        .eq('id', songId);
    }

    if (!previewUrl) {
      return NextResponse.json(
        { success: false, message: '미리듣기 음원을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, preview_url: previewUrl });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
