// app/api/admin/verify/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: '비밀번호를 입력해주세요.' }, { status: 400 });
    }

    // Supabase DB에서 관리자 비밀번호 조회
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'admin_password')
      .single();

    if (error || !data) {
      console.error('[Admin Verify Error]:', error);
      return NextResponse.json({ error: '관리자 설정을 DB에서 불러올 수 없습니다.' }, { status: 500 });
    }

    // 비밀번호 비교 (공백 제거 후 비교)
    if (data.value.trim() !== password.trim()) {
      return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Admin Verify Route Catch]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}