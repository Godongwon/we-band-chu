// app/api/admin/reports/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

// 1. 대기 중인 신고 목록 조회 (연결된 YouTube URL 및 곡 정보 포함)
export async function GET() {
  try {
    const { data: reports, error } = await supabase
      .from('song_reports')
      .select(`
        id,
        song_id,
        title,
        artist,
        reason,
        status,
        created_at,
        songs:song_id (
          id,
          youtube_url,
          genre,
          bpm,
          original_key
        )
      `)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 포맷 정리
    const formatted = (reports || []).map((r: any) => ({
      report_id: r.id,
      song_id: r.song_id,
      title: r.title,
      artist: r.artist,
      reason: r.reason,
      created_at: r.created_at,
      youtube_url: r.songs?.youtube_url || null,
      genre: r.songs?.genre || '미지정',
      bpm: r.songs?.bpm || null,
      original_key: r.songs?.original_key || null,
    }));

    return NextResponse.json({ success: true, reports: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 신고된 곡 영구 삭제 (곡 테이블에서 삭제하면 CASCADE로 신고도 자동 처리)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const songId = searchParams.get('song_id');

    if (!songId) {
      return NextResponse.json({ success: false, message: 'song_id가 필요합니다.' }, { status: 400 });
    }

    // 곡 삭제 (외래키 제약조건으로 song_reports는 자동 삭제됨)
    const { error } = await supabase.from('songs').delete().eq('id', songId);
    if (error) throw error;

    return NextResponse.json({ success: true, message: '곡과 관련 신고가 완전히 삭제되었습니다.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. 정상 곡인 경우 신고만 반려(기각) 처리
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { report_id } = body;

    if (!report_id) {
      return NextResponse.json({ success: false, message: 'report_id가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('song_reports')
      .update({ status: 'DISMISSED' })
      .eq('id', report_id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: '신고가 정상 반려 처리되었습니다.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}