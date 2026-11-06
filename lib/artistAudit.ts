// lib/artistAudit.ts
import {
  TargetArtist,
  SongItem,
  ArtistAuditResult,
  ArtistAuditIssueType,
} from '@/app/admin/harvest/types';

export function normalizeArtistSearch(text?: string | null): string {
  return (text || '').toLowerCase().replace(/\s+/g, '');
}

// 힙합/래퍼, 순수 댄스 아이돌, R&B 보컬그룹, 일렉트로닉/테크노팝 등 합주용 밴드가 아닌 아티스트 사전
const KNOWN_NON_BAND_ARTISTS: {
  keywords: string[];
  reason: string;
}[] = [
  { keywords: ['타이거jk', 'tigerjk'], reason: '힙합/래퍼 아티스트 (밴드 아님)' },
  { keywords: ['허클베리피', 'huckleberryp'], reason: '힙합/래퍼 아티스트 (밴드 아님)' },
  { keywords: ['크루셜스타', 'crucialstar'], reason: '힙합/R&B 아티스트 (밴드 아님)' },
  { keywords: ['크래비티', 'cravity'], reason: '남성 댄스 아이돌 그룹 (밴드 아님)' },
  { keywords: ['rescene', '리센느'], reason: '여성 댄스 아이돌 그룹 (밴드 아님)' },
  { keywords: ['하이라이트', 'highlight'], reason: '남성 댄스 아이돌 그룹 (밴드 아님)' },
  { keywords: ['아이들', '(g)i-dle', 'gidle'], reason: '여성 댄스 아이돌 그룹 (밴드 아님)' },
  { keywords: ['전소연', 'soyeon'], reason: '아이돌/래퍼 솔로 아티스트 (밴드 아님)' },
  { keywords: ['퍼퓸', 'perfume'], reason: '일렉트로닉/테크노팝 댄스 그룹 (밴드 아님)' },
  { keywords: ['보이즈투맨', 'boyziimen'], reason: 'R&B 보컬 그룹 (밴드 아님)' },
  { keywords: ['위켄드', 'theweeknd', 'weeknd'], reason: 'R&B/팝 솔로 아티스트 (밴드 아님)' },
  { keywords: ['아지아틱스', 'aziatix'], reason: 'R&B/힙합 그룹 (밴드 아님)' },
];

// LLM 환각 등으로 한글명과 영문 검색 별칭(search_alias)이 전혀 다른 아티스트로 잘못 매칭된 사례 사전
const KNOWN_MISMATCHED_ALIASES: {
  nameNorm: string;
  aliasNorm?: string;
  reason: string;
}[] = [
  {
    nameNorm: '타이거jk',
    aliasNorm: 'mondogrosso',
    reason: '한글명(타이거 JK)과 영문 별칭(Mondo Grosso: 일본 전자음악가) 불일치',
  },
  {
    nameNorm: '모건월든',
    aliasNorm: 'måneskin',
    reason: '한글명(모건 월든)과 영문 별칭(Måneskin: 모네스킨) 불일치 오매칭',
  },
  {
    nameNorm: '수퍼내추럴',
    aliasNorm: 'superorganism',
    reason: '한글명(수퍼내추럴)과 영문 별칭(Superorganism) 불일치 오매칭',
  },
  {
    nameNorm: '오디에스',
    aliasNorm: 'audioslave',
    reason: '영문 밴드 Audioslave의 한글 표기 오기재(오디에스)',
  },
  {
    nameNorm: '로열피그스',
    aliasNorm: 'royalpirates',
    reason: '로열 파이럿츠(Royal Pirates)의 한글 표기 오기재(로열 피그스)',
  },
  {
    nameNorm: '아리카',
    aliasNorm: 'alia',
    reason: '일본 밴드 AliA(아리아)의 한글 표기 오기재(아리카)',
  },
  {
    nameNorm: '맥스파인드',
    aliasNorm: 'maxgiesinger',
    reason: '한글명(맥스 파인드)과 영문 별칭(Max Giesinger) 불일치 오매칭',
  },
  {
    nameNorm: '오가와코이치',
    aliasNorm: 'coil',
    reason: '한글명(오가와 코이치)과 영문 별칭(Coil) 불일치 오매칭',
  },
  {
    nameNorm: '키사마',
    aliasNorm: 'kissa',
    reason: '모호한 아티스트명 및 별칭(Kissa) 오매칭 의심',
  },
  {
    nameNorm: '키보호',
    aliasNorm: 'kiroakn',
    reason: '모호한 아티스트명 및 별칭(Kiro Akn) 오매칭 의심',
  },
  {
    nameNorm: '웨이스트랜드',
    aliasNorm: 'wastedlaudis',
    reason: '한글명(웨이스트랜드)과 영문 별칭(Wasted Laudis) 불일치 의심',
  },
  {
    nameNorm: '아남&매니지',
    aliasNorm: 'anam&management',
    reason: '비정상 밴드명/기획사명 의심 (ANAM & MANAGEMENT)',
  },
];

const NON_BAND_SONG_GENRES = [
  'hip-hop',
  'rap',
  'r&b',
  'soul',
  'dance',
  'electronic',
  'edm',
  'classical',
  'trot',
];

export function auditTargetArtists(
  artists: TargetArtist[],
  songs: SongItem[],
  aiAuditMap: Record<string, { types: ArtistAuditIssueType[]; reasons: string[] }> = {}
): Map<string, ArtistAuditResult> {
  const resultMap = new Map<string, ArtistAuditResult>();

  // 1. 아티스트별 수집된 곡 수 및 비밴드 장르 곡 수 집계
  const songsByArtist = new Map<string, SongItem[]>();
  for (const s of songs) {
    const key = normalizeArtistSearch(s.artist);
    if (!key) continue;
    const list = songsByArtist.get(key) || [];
    list.push(s);
    songsByArtist.set(key, list);
  }

  // 2. 중복 등록 감지용 카운터 (정규화된 search_alias 및 괄호 제거한 기본 이름 기준)
  const aliasGroupMap = new Map<string, TargetArtist[]>();
  const baseNameGroupMap = new Map<string, TargetArtist[]>();

  for (const artist of artists) {
    const normAlias = normalizeArtistSearch(artist.search_alias)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (normAlias) {
      const list = aliasGroupMap.get(normAlias) || [];
      list.push(artist);
      aliasGroupMap.set(normAlias, list);
    }

    const baseName = normalizeArtistSearch(
      (artist.name || '').replace(/\s*\(.*?\)\s*/g, '')
    );
    if (baseName) {
      const list = baseNameGroupMap.get(baseName) || [];
      list.push(artist);
      baseNameGroupMap.set(baseName, list);
    }
  }

  for (const artist of artists) {
    const typesSet = new Set<ArtistAuditIssueType>();
    const reasons: string[] = [];

    const normName = normalizeArtistSearch(artist.name);
    const normAlias = normalizeArtistSearch(artist.search_alias);
    const normAliasAscii = normAlias.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const artistSongs = songsByArtist.get(normName) || [];
    const songCount = artistSongs.length;

    // (A) 비밴드 아티스트 사전 검사
    for (const rule of KNOWN_NON_BAND_ARTISTS) {
      if (
        rule.keywords.some(
          (kw) => normName === kw || normAlias === kw || normName.includes(kw)
        )
      ) {
        typesSet.add('NON_BAND');
        reasons.push(rule.reason);
        break;
      }
    }

    // (B) 수집된 곡의 장르 기반 비밴드 의심 검사
    if (songCount > 0) {
      const nonBandSongs = artistSongs.filter((s) => {
        const g = (s.genre || '').toLowerCase();
        return NON_BAND_SONG_GENRES.some((bad) => g.includes(bad));
      });
      if (nonBandSongs.length > 0 && nonBandSongs.length >= Math.ceil(songCount * 0.5)) {
        typesSet.add('NON_BAND');
        const sampleGenre = nonBandSongs[0].genre || '비밴드 장르';
        reasons.push(
          `수집곡 중 비밴드 장르(${sampleGenre}) 비중 높음 (${nonBandSongs.length}/${songCount}곡)`
        );
      }
    }

    // (C) 별칭(search_alias) 누락, 한글 포함, 또는 알려진 한/영 불일치 오매칭 검사
    if (!artist.search_alias || !artist.search_alias.trim()) {
      typesSet.add('ALIAS_ERROR');
      reasons.push('영문 검색 별칭(search_alias)이 비어 있음');
    } else if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(artist.search_alias)) {
      typesSet.add('ALIAS_ERROR');
      reasons.push(`영문 별칭(${artist.search_alias})에 한글이 포함되어 있음`);
    }

    for (const mismatch of KNOWN_MISMATCHED_ALIASES) {
      if (
        normName === mismatch.nameNorm &&
        (!mismatch.aliasNorm || normAlias === mismatch.aliasNorm)
      ) {
        typesSet.add('ALIAS_ERROR');
        reasons.push(mismatch.reason);
      }
    }

    // (D) 중복 등록 아티스트 검사
    const sameAliasList = normAliasAscii ? aliasGroupMap.get(normAliasAscii) || [] : [];
    const baseName = normalizeArtistSearch((artist.name || '').replace(/\s*\(.*?\)\s*/g, ''));
    const sameBaseList = baseName ? baseNameGroupMap.get(baseName) || [] : [];

    if (sameAliasList.length > 1) {
      const others = sameAliasList
        .filter((a) => a.id !== artist.id)
        .map((a) => a.name)
        .join(', ');
      typesSet.add('DUPLICATE');
      reasons.push(`동일 영문 별칭(${artist.search_alias}) 중복 등록: ${others}`);
    } else if (sameBaseList.length > 1) {
      const others = sameBaseList
        .filter((a) => a.id !== artist.id)
        .map((a) => a.name)
        .join(', ');
      typesSet.add('DUPLICATE');
      reasons.push(`동일 밴드명 중복 등록: ${others}`);
    }

    // (E) 이미 수집 시도되었으나 수집된 곡이 0곡인 아티스트 검사
    if ((artist.last_harvested_at || artist.priority === 3) && songCount === 0) {
      typesSet.add('ZERO_SONGS');
      reasons.push('수집 실행 이력이 있으나 현재 DB에 수집된 곡이 0곡임 (검색 별칭 또는 아티스트명 점검 필요)');
    }

    // (F) AI 정밀 검사 결과 병합
    const aiResult = aiAuditMap[artist.id];
    if (aiResult) {
      for (const t of aiResult.types) {
        typesSet.add(t);
      }
      for (const r of aiResult.reasons) {
        if (!reasons.includes(r)) {
          reasons.push(r);
        }
      }
    }

    resultMap.set(artist.id, {
      artistId: artist.id,
      types: Array.from(typesSet),
      reasons,
      songCount,
    });
  }

  return resultMap;
}

