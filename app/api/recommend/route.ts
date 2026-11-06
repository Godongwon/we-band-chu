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

// 키보드 편성이 두드러지는 밴드/아티스트 목록
const KEYBOARD_FRIENDLY_ARTISTS = new Set([
  '데이식스',
  'DAY6',
  '루시',
  'LUCY',
  '잔나비',
  'JANNABI',
  '유다빈밴드',
  '터치드',
  'TOUCHED',
  'QWER',
  'YOASOBI',
  'ZUTOMAYO',
  '녹황색사회',
  '페퍼톤스',
  'PEPPERTONES',
  '아도이',
  'ADOY',
  '검정치마',
  '넬',
  'NELL',
]);

// 2기타 또는 강렬한 기타 리프 중심 밴드 목록
const GUITAR_RIFF_ARTISTS = new Set([
  '실리카겔',
  'Silica Gel',
  '쏜애플',
  'THORNAPPLE',
  '국카스텐',
  'YB',
  '체리필터',
  '자우림',
  '새소년',
  '한로로',
  '너드커넥션',
  '웨이브투어스',
  'Yorushika',
  'SHISHAMO',
  'The Peggies',
  'Paramore',
  'Against The Current',
  '뷰렛',
  '워킹 애프터 유',
]);

export async function POST(req: Request) {
  try {
    const {
      category = 'HIGH_TENSION',
      bandProfile,
      repertoireSongs = [],
      excludeTitles = [],
      recentRecommendedIds = [],
    } = await req.json();

    const targetVocalGender = (bandProfile?.vocal_gender || 'FEMALE').toUpperCase();
    const guitarCount = bandProfile?.guitar_count ?? 1;
    const hasKeys = bandProfile?.has_keys ?? true;

    // 1. DB에서 전체 곡 조회 (성능 최적화: 필요한 필수 컬럼만 선별 조회하여 네트워크 및 메모리 대역폭 절감)
    const { data: songs, error } = await supabase
      .from('songs')
      .select('id, title, artist, genre, bpm, original_key, vocal_gender, preview_url, youtube_url, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!songs || songs.length === 0) {
      return NextResponse.json({ success: true, recommendations: [] });
    }

    // 2. 이미 레퍼토리에 담긴 곡 제외
    const excludeSet = new Set(
      excludeTitles.map((t: string) => String(t || '').toLowerCase().trim())
    );
    let candidateSongs = songs.filter(
      (s) => s.title && !excludeSet.has(s.title.toLowerCase().trim())
    );

    // 3. 레퍼토리 분석 (🎸 레퍼토리 유사 탭 및 개인화 가산점용)
    const repArtistSet = new Set<string>();
    const repGenreSet = new Set<string>();
    let repBpmSum = 0;
    let repBpmCount = 0;

    if (Array.isArray(repertoireSongs)) {
      for (const r of repertoireSongs) {
        if (r?.artist) repArtistSet.add(String(r.artist).toLowerCase().trim());
        if (r?.genre) repGenreSet.add(String(r.genre).toLowerCase().trim());
        if (typeof r?.bpm === 'number' && r.bpm > 0) {
          repBpmSum += r.bpm;
          repBpmCount++;
        }
      }
    }
    const avgRepBpm = repBpmCount > 0 ? Math.round(repBpmSum / repBpmCount) : null;

    // 4. 탭(category)별 엄격한 BPM/특성 필터링 (미측정 bpm: null 혼입 방지)
    if (category === 'HIGH_TENSION') {
      const highBpmSongs = candidateSongs.filter(
        (s) => typeof s.bpm === 'number' && s.bpm >= 130
      );
      if (highBpmSongs.length >= 10) {
        candidateSongs = highBpmSongs;
      }
    } else if (category === 'EMOTIONAL') {
      const emotionalSongs = candidateSongs.filter(
        (s) => typeof s.bpm === 'number' && s.bpm >= 65 && s.bpm <= 114
      );
      if (emotionalSongs.length >= 10) {
        candidateSongs = emotionalSongs;
      }
    } else if (category === 'PLAYING_FEEL') {
      const feelSongs = candidateSongs.filter(
        (s) => typeof s.bpm === 'number' && s.bpm >= 110 && s.bpm <= 148
      );
      if (feelSongs.length >= 10) {
        candidateSongs = feelSongs;
      }
    }

    const recentIdSet = new Set(
      Array.isArray(recentRecommendedIds) ? recentRecommendedIds : []
    );

    // 5. 곡별 다차원 스코어링 & 추천 사유(reason) 생성
    const scoredSongs = candidateSongs.map((song) => {
      let score = 50;
      const reasons: string[] = [];
      const songGender = (song.vocal_gender || 'FEMALE').toUpperCase();
      const artistLower = String(song.artist || '').toLowerCase().trim();
      const genreLower = String(song.genre || '').toLowerCase().trim();

      let recommendedKey = song.original_key || '원키 유지';

      // (A) 보컬 성별 매칭 및 이조 키 산출
      if (targetVocalGender === 'FEMALE') {
        if (songGender === 'FEMALE') {
          score += 45;
          recommendedKey = song.original_key || '원키 유지';
          reasons.push('여성 보컬 원키 맞춤');
        } else if (songGender === 'COED') {
          score += 35;
          recommendedKey = song.original_key || '원키 유지';
          reasons.push('여성/혼성 보컬 호환');
        } else {
          score += 10;
          recommendedKey = transposeKey(song.original_key, 4);
          reasons.push(
            song.original_key
              ? `남성 원곡 (${recommendedKey} 여보키 이조 추천)`
              : '남성 원곡 (+4반음 이조 추천)'
          );
        }
      } else {
        if (songGender === 'MALE') {
          score += 45;
          recommendedKey = song.original_key || '원키 유지';
          reasons.push('남성 보컬 원키 맞춤');
        } else if (songGender === 'COED') {
          score += 35;
          recommendedKey = song.original_key || '원키 유지';
          reasons.push('남성/혼성 보컬 호환');
        } else {
          score += 10;
          recommendedKey = transposeKey(song.original_key, -4);
          reasons.push(
            song.original_key
              ? `여성 원곡 (${recommendedKey} 남보키 이조 추천)`
              : '여성 원곡 (-4반음 이조 추천)'
          );
        }
      }

      // (B) 악기 구성(1기타/2기타, 건반 유무) 적합도 반영
      const isKeyFriendly =
        KEYBOARD_FRIENDLY_ARTISTS.has(song.artist) ||
        genreLower.includes('pop') ||
        genreLower.includes('synth');
      const isGuitarHeavy =
        GUITAR_RIFF_ARTISTS.has(song.artist) ||
        genreLower.includes('rock') ||
        genreLower.includes('alternative') ||
        genreLower.includes('punk');

      if (hasKeys && isKeyFriendly) {
        score += 12;
        if (category === 'PLAYING_FEEL') reasons.push('건반 사운드 활약');
      } else if (!hasKeys && isGuitarHeavy) {
        score += 14;
        if (category === 'PLAYING_FEEL') reasons.push('건반 없이 꽉 차는 기타 사운드');
      }

      if (guitarCount >= 2 && isGuitarHeavy) {
        score += 14;
        if (category === 'PLAYING_FEEL') reasons.push('2기타 리프/배킹 시너지');
      } else if (guitarCount === 1 && !isGuitarHeavy) {
        score += 8;
      }

      // (C) 카테고리별 특화 가산점 및 추천 사유
      if (category === 'REPERTOIRE') {
        if (repArtistSet.has(artistLower)) {
          score += 35;
          reasons.push(`레퍼토리 밴드(${song.artist}) 연관 추천`);
        }
        if (avgRepBpm && typeof song.bpm === 'number') {
          const bpmDiff = Math.abs(song.bpm - avgRepBpm);
          if (bpmDiff <= 15) {
            score += 22;
            reasons.push(`선호 템포(${avgRepBpm} BPM) 유사`);
          } else if (bpmDiff <= 25) {
            score += 10;
          }
        }
        if (repGenreSet.has(genreLower)) {
          score += 12;
        }
      } else if (category === 'HIGH_TENSION') {
        if (typeof song.bpm === 'number' && song.bpm >= 145) {
          score += 18;
          reasons.push('고텐션 질주 비트');
        } else if (typeof song.bpm === 'number' && song.bpm >= 130) {
          score += 10;
          reasons.push('업템포 라이브용');
        }
      } else if (category === 'EMOTIONAL') {
        if (typeof song.bpm === 'number' && song.bpm >= 70 && song.bpm <= 105) {
          score += 18;
          reasons.push('감성 미디엄/발라드 템포');
        }
      } else if (category === 'PLAYING_FEEL') {
        if (typeof song.bpm === 'number' && song.bpm >= 118 && song.bpm <= 140) {
          score += 15;
          if (reasons.length === 1) reasons.push('리듬/합주 손맛 우수');
        }
      }

      // BPM과 Key가 모두 실측 완료된 곡 우대
      if (song.bpm && song.original_key) {
        score += 8;
      }

      // 직전 새로고침에서 이미 노출된 곡은 후순위로 배치하여 새로고침 시 새로운 곡 노출 보장
      if (song.id && recentIdSet.has(song.id)) {
        score -= 28;
      }

      // 동점 그룹 내 자연스러운 셔플을 위한 가중치 난수 (+0 ~ +15점)
      const randomJitter = Math.random() * 15;

      return {
        id: song.id,
        title: song.title,
        artist: song.artist,
        genre: song.genre || 'Rock/Band',
        bpm: song.bpm || 120,
        original_key: song.original_key,
        recommended_key: recommendedKey,
        vocal_gender: songGender,
        youtube_url: song.youtube_url,
        preview_url: song.preview_url,
        reason: reasons.slice(0, 2).join(' · '),
        score: score + randomJitter,
      };
    });

    scoredSongs.sort((a, b) => b.score - a.score);

    // 6. 아티스트 독점 방지: 한 밴드당 최대 2곡까지만 우선 선발하여 10곡 구성
    const MAX_PER_ARTIST = 2;
    const artistCountMap = new Map<string, number>();
    const selectedRecommendations: typeof scoredSongs = [];
    const overflowSongs: typeof scoredSongs = [];

    for (const item of scoredSongs) {
      if (selectedRecommendations.length >= 10) break;
      const artistKey = String(item.artist || '').toLowerCase().trim();
      const count = artistCountMap.get(artistKey) || 0;

      if (count < MAX_PER_ARTIST) {
        selectedRecommendations.push(item);
        artistCountMap.set(artistKey, count + 1);
      } else {
        overflowSongs.push(item);
      }
    }

    // 만약 전체 아티스트 종류가 부족해 10곡이 안 채워진 경우에만 차순위 곡으로 보충
    for (const item of overflowSongs) {
      if (selectedRecommendations.length >= 10) break;
      selectedRecommendations.push(item);
    }

    return NextResponse.json({
      success: true,
      recommendations: selectedRecommendations,
    });
  } catch (err: any) {
    console.error('[추천 API 에러]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
