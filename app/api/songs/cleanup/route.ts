import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const maxDuration = 60;

const NON_BAND_GENRES = [
  'Classical',
  'Soundtrack',
  'Dance',
  'Electronic',
  'Hip-Hop/Rap',
  'Hip-Hop',
  'Rap',
  'R&B/Soul',
  'R&B',
  'Soul',
  'Trot',
  'Children\'s Music',
  'Anime',
  'Spoken Word',
  'Comedy',
];

const BAD_TITLE_KEYWORDS = [
  'remix',
  '리믹스',
  'club mix',
  'edm',
  'soundtrack',
  'ost part',
  'orchestra',
  'inst.',
  'instrumental',
  'piano ver',
  'acoustic ver',
  'karaoke',
];

export async function POST() {
  try {
    const { data: allSongs, error: fetchErr } = await supabase
      .from('songs')
      .select('id, title, artist, genre');

    if (fetchErr) throw fetchErr;
    if (!allSongs || allSongs.length === 0) {
      return NextResponse.json({ success: true, deletedCount: 0, message: '정리할 곡이 없습니다.' });
    }

    const targetIdsToDelete: string[] = [];

    for (const song of allSongs) {
      const g = (song.genre || '').toLowerCase();
      const t = (song.title || '').toLowerCase();

      const isBadGenre = NON_BAND_GENRES.some((bg) => g.includes(bg.toLowerCase()));
      const isBadTitle = BAD_TITLE_KEYWORDS.some((kw) => t.includes(kw));

      if (isBadGenre || isBadTitle) {
        targetIdsToDelete.push(song.id);
      }
    }

    if (targetIdsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: '비밴드 장르 또는 비정상 음원이 발견되지 않았습니다.',
      });
    }

    const chunkSize = 50;
    for (let i = 0; i < targetIdsToDelete.length; i += chunkSize) {
      const chunk = targetIdsToDelete.slice(i, i + chunkSize);
      await supabase.from('songs').delete().in('id', chunk);
    }

    console.log(`[관리자] 비밴드 음원 총 ${targetIdsToDelete.length}곡 일괄 삭제 완료`);

    return NextResponse.json({
      success: true,
      deletedCount: targetIdsToDelete.length,
      message: `총 ${targetIdsToDelete.length}개의 비밴드/비정상 음원이 정리되었습니다.`,
    });
  } catch (error: any) {
    console.error('[관리자] 음원 정리 에러:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}