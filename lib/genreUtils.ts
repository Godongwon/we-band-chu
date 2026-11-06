// lib/genreUtils.ts

/**
 * 음원 장르 표준화 유틸리티
 * 1. 록/Rock 계열 ('록', '한국 록', 'ロック', '하드록', '모던록' 등) -> 'Rock'
 * 2. 인디 계열 ('한국 인디', '인디 록', '인디록', 'Indie Rock', 'Korean Indie', '韓国インディー' 등) -> '인디'
 * 3. 싱어송라이터 ('シンガーソングライター', 'Singer/Songwriter') -> '싱어송라이터'
 * 4. 일본어 및 기타 잡음 장르 표준화
 */
export function normalizeGenre(rawGenre?: string | null): string {
  if (!rawGenre) return 'Rock';
  const g = rawGenre.trim();

  // 1. 인디 관련: "한국 인디, 인디록 같은 경우는 인디로"
  if (
    g === '한국 인디' ||
    g === '인디 록' ||
    g === '인디록' ||
    g === 'Indie Rock' ||
    g === 'Korean Indie' ||
    g === '인디 팝' ||
    g === '한국인디' ||
    g === '韓国インディー'
  ) {
    return '인디';
  }

  // 2. 록/Rock 관련: "록이아니라 Rock"
  if (
    g === '록' ||
    g === '한국 록' ||
    g === 'Korean Rock' ||
    g === 'ロック' ||
    g === '韓国ロック' ||
    g === '하드록' ||
    g === '모던록' ||
    g === '정통 록' ||
    g === '레트로 록' ||
    g === '블루스 록' ||
    g === '사이키델릭 록' ||
    g === '아트 록' ||
    g === '포스트 록' ||
    g === '팝 록' ||
    g === '팝/록' ||
    g === '펑크 록'
  ) {
    return 'Rock';
  }

  // 3. 싱어송라이터
  if (g === 'シンガーソングライター' || g === 'Singer/Songwriter') {
    return '싱어송라이터';
  }

  // 4. 일본어 및 기타 표준화
  if (g === 'エレクトロニック') return '일렉트로닉';
  if (g === 'サウンドトラック' || g === 'TV OST') return 'OST';
  if (
    g === 'コンテンポラリー・フォーク' ||
    g === 'フォーク' ||
    g === 'Korean Folk-Pop' ||
    g === '韓国フォークポップ'
  ) {
    return '포크';
  }
  if (g === 'ヒップホップ／ラップ' || g === '韓国ヒップホップ') return '힙합/랩';
  if (g === 'ダンス') return '댄스';
  if (g === 'Pop') return '팝';
  if (g === 'Alternative') return '얼터너티브';

  return g;
}

