// app/api/recommend/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const CHROMATIC_SCALE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function transposeKey(key: string | null, semitones: number): string {
  if (!key) return '원키 유지';
  const isMinor = key.includes('m');
  const baseKey = key.replace('m', '').trim();
  const index = CHROMATIC_SCALE.indexOf(baseKey);
  if (index === -1) return `${key} (이조 추천)`;

  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;
  return `${CHROMATIC_SCALE[newIndex]}${isMinor ? 'm' : ''}`;
}

export async function POST(req: Request) {
  try {
    const { category, bandProfile, excludeTitles = [] } = await req.json();

    const targetVocalGender = bandProfile?.vocal_gender || 'FEMALE';
    const guitarCount = bandProfile?.guitar_count ?? 1;
    const hasKeys = bandProfile?.has_keys ?? true;

    // 1. DB에서 곡 전체 조회 (vocal_gender 포함)
    const { data: songs, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!songs || songs.length === 0) {
      return NextResponse.json({ success: true, recommendations: [] });
    }

    const excludeSet = new Set(excludeTitles.map((t: string) => t.toLowerCase().trim()));
    let candidateSongs = songs.filter((s) => !excludeSet.has(s.title.toLowerCase().trim()));

    // 2. 카테고리 필터링
    if (category === 'HIGH_TENSION') {
      candidateSongs = candidateSongs.filter((s) => s.bpm === null || s.bpm >= 135);
    } else if (category === 'EMOTIONAL') {
      candidateSongs = candidateSongs.filter((s) => s.bpm === null || (s.bpm >= 70 && s.bpm <= 115));
    } else if (category === 'PLAYING_FEEL') {
      candidateSongs = candidateSongs.filter((s) => !hasKeys || (s.bpm !== null && s.bpm >= 120));
    }

    // 3. DB vocal_gender 컬럼 기반 스코어링 & 추천 Key 결정
    const scoredSongs = candidateSongs.map((song) => {
      let score = 50;
      const songGender = (song.vocal_gender || 'FEMALE').toUpperCase();

      let recommendedKey = song.original_key || '원키 유지';
      let vocalReason = '';

      if (targetVocalGender === 'FEMALE') {
        if (songGender === 'FEMALE') {
          score += 45; // 여성 보컬 밴드에 여성 원곡 최우선 배정
          recommendedKey = song.original_key || '원키 유지';
          vocalReason = '여성 보컬 최적화 (원키)';
        } else if (songGender === 'COED') {
          score += 35; // 혼성/객원 보컬
          recommendedKey = song.original_key || '원키 유지';
          vocalReason = '여성/혼성 보컬 호환';
        } else {
          // 남성 보컬 곡 -> 여성 보컬 추천 시 이조
          score += 10;
          recommendedKey = transposeKey(song.original_key, 4);
          vocalReason = '남성 원곡 (+4반음 여보키 추천)';
        }
      } else {
        // 남성 보컬 밴드인 경우
        if (songGender === 'MALE') {
          score += 45;
          recommendedKey = song.original_key || '원키 유지';
          vocalReason = '남성 보컬 최적화 (원키)';
        } else if (songGender === 'COED') {
          score += 35;
          recommendedKey = song.original_key || '원키 유지';
          vocalReason = '남성/혼성 보컬 호환';
        } else {
          // 여성 보컬 곡 -> 남성 보컬 추천 시 이조
          score += 10;
          recommendedKey = transposeKey(song.original_key, -4);
          vocalReason = '여성 원곡 (-4반음 남보키 추천)';
        }
      }

      if (hasKeys && song.genre?.toLowerCase().includes('pop')) score += 10;
      if (guitarCount === 2 && song.genre?.toLowerCase().includes('rock')) score += 10;

      return {
        id: song.id,
        title: song.title,
        artist: song.artist,
        genre: song.genre || 'Rock/Band',
        bpm: song.bpm || 120,
        original_key: song.original_key,
        recommended_key: recommendedKey,
        youtube_url: song.youtube_url,
        reason: vocalReason,
        score,
      };
    });

    scoredSongs.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      recommendations: scoredSongs.slice(0, 10),
    });
  } catch (err: any) {
    console.error('[추천 API 에러]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}