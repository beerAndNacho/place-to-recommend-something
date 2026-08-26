import seoulHotspots from "@/data/seoul-hotspots.json";
import type {
  CrowdLevel,
  CrowdTrend,
  ForecastPoint,
  Place,
  PlaceCategory,
  PlaceDefinition,
} from "@/types/place";

interface SeoulHotspotRow {
  area_nm: string;
  congestion_color: string;
  x: string;
  y: string;
  area_congest_lvl: string;
  category: string;
  area_congest_num: number;
}

interface PlaceOverride {
  slug: string;
  name?: string;
  district: string;
  summary: string;
  categories: PlaceCategory[];
  tags: string[];
  searchKeywords: string[];
  recommendationBase: number;
}

const overrides: Record<string, PlaceOverride> = {
  "서울숲공원": {
    slug: "seoul-forest",
    name: "서울숲",
    district: "성동구",
    summary: "넓은 산책로와 잔디밭이 있어 데이트와 가벼운 휴식에 잘 맞아요.",
    categories: ["date", "walk", "quiet", "photo", "family"],
    tags: ["데이트", "산책", "피크닉"],
    searchKeywords: ["서울숲공원", "성수", "뚝섬", "공원"],
    recommendationBase: 96,
  },
  "성수카페거리": {
    slug: "seongsu-cafe-street",
    district: "성동구",
    summary: "신규 카페와 팝업이 밀집해 활기찬 데이트나 사진 중심 일정에 좋아요.",
    categories: ["date", "hotspot", "photo", "night"],
    tags: ["카페", "팝업", "사진"],
    searchKeywords: ["성수", "카페거리", "팝업스토어"],
    recommendationBase: 91,
  },
  "홍대 관광특구": {
    slug: "hongdae",
    name: "홍대",
    district: "마포구",
    summary: "공연, 쇼핑, 음식점이 늦은 시간까지 이어지는 대표적인 도심 핫플이에요.",
    categories: ["date", "hotspot", "night", "photo"],
    tags: ["공연", "쇼핑", "야간"],
    searchKeywords: ["홍대입구", "연남", "합정", "홍대 관광특구"],
    recommendationBase: 88,
  },
  "강남역": {
    slug: "gangnam-station",
    district: "강남구",
    summary: "교통과 상권 접근성이 좋아 모임 장소로 편리하지만 퇴근 시간 혼잡을 확인해야 해요.",
    categories: ["date", "hotspot", "night"],
    tags: ["모임", "맛집", "교통"],
    searchKeywords: ["강남", "신논현", "역삼"],
    recommendationBase: 86,
  },
  "잠실롯데타워·석촌호수": {
    slug: "jamsil-lake",
    name: "잠실·석촌호수",
    district: "송파구",
    summary: "호수 산책과 쇼핑을 한 번에 묶기 좋아 가족 나들이와 데이트 모두 무난해요.",
    categories: ["date", "walk", "family", "photo", "hotspot"],
    tags: ["호수", "쇼핑", "가족"],
    searchKeywords: ["잠실", "롯데타워", "석촌호수", "송리단길"],
    recommendationBase: 94,
  },
  "광화문·덕수궁": {
    slug: "gwanghwamun",
    district: "종로구",
    summary: "역사 공간과 넓은 보행 동선을 함께 즐길 수 있어 낮 산책과 문화 일정에 좋아요.",
    categories: ["date", "walk", "quiet", "photo", "family"],
    tags: ["궁궐", "산책", "전시"],
    searchKeywords: ["광화문", "덕수궁", "시청", "광화문광장"],
    recommendationBase: 95,
  },
  "여의도한강공원": {
    slug: "yeouido-hangang",
    district: "영등포구",
    summary: "강변 피크닉과 노을 감상이 좋아 날씨 좋은 날의 데이트·나들이 후보예요.",
    categories: ["date", "walk", "quiet", "night", "photo", "family"],
    tags: ["한강", "피크닉", "노을"],
    searchKeywords: ["여의도", "한강공원", "여의나루"],
    recommendationBase: 97,
  },
  "남산공원": {
    slug: "namsan-park",
    district: "중구",
    summary: "도심 전망과 숲길이 함께 있어 조용한 산책이나 야경 데이트에 잘 맞아요.",
    categories: ["date", "walk", "quiet", "night", "photo"],
    tags: ["전망", "숲길", "야경"],
    searchKeywords: ["남산", "서울타워", "N서울타워", "야경"],
    recommendationBase: 96,
  },
  "북촌한옥마을": {
    slug: "bukchon",
    district: "종로구",
    summary: "한옥 골목과 전시 공간을 천천히 둘러보기 좋지만 보행 혼잡을 확인하는 편이 좋아요.",
    categories: ["date", "walk", "photo", "hotspot"],
    tags: ["한옥", "골목", "사진"],
    searchKeywords: ["북촌", "삼청동", "한옥마을"],
    recommendationBase: 91,
  },
  "익선동": {
    slug: "ikseon-dong",
    district: "종로구",
    summary: "작은 골목에 카페와 식당이 모여 있어 짧고 밀도 높은 도심 데이트에 좋아요.",
    categories: ["date", "hotspot", "photo", "night"],
    tags: ["골목", "카페", "데이트"],
    searchKeywords: ["익선동 한옥거리", "종로3가", "인사동"],
    recommendationBase: 92,
  },
};

const categoryMeta: Record<string, {
  categories: PlaceCategory[];
  tags: string[];
  summary: string;
  populationBase: number;
}> = {
  "공원": {
    categories: ["walk", "quiet", "photo", "family", "date"],
    tags: ["공원", "산책", "나들이"],
    summary: "도심 속 산책과 휴식, 가족 나들이를 함께 즐기기 좋은 공간이에요.",
    populationBase: 6500,
  },
  "고궁·문화유산": {
    categories: ["walk", "quiet", "photo", "family", "date"],
    tags: ["문화", "산책", "사진"],
    summary: "서울의 역사와 문화를 천천히 둘러보며 사진을 남기기 좋은 장소예요.",
    populationBase: 7600,
  },
  "발달상권": {
    categories: ["hotspot", "date", "night", "photo"],
    tags: ["상권", "맛집", "데이트"],
    summary: "맛집과 쇼핑, 카페가 모여 있어 약속이나 도심 데이트에 편리한 지역이에요.",
    populationBase: 12500,
  },
  "인구밀집지역": {
    categories: ["hotspot", "night"],
    tags: ["역세권", "교통", "상권"],
    summary: "교통과 생활 상권이 밀집한 지역이라 시간대별 혼잡도를 확인하는 편이 좋아요.",
    populationBase: 15500,
  },
  "관광특구": {
    categories: ["hotspot", "date", "night", "photo", "family"],
    tags: ["관광", "쇼핑", "사진"],
    summary: "볼거리와 상권이 함께 모인 서울 대표 관광 지역이에요.",
    populationBase: 18500,
  },
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function crowdLevel(level: string): CrowdLevel {
  if (level === "붐빔") return "veryBusy";
  if (level === "약간 붐빔") return "busy";
  if (level === "보통") return "normal";
  return "relaxed";
}

function crowdMessage(level: CrowdLevel): string {
  if (level === "veryBusy") return "현재 방문객이 많아 이동과 대기 시간을 넉넉하게 잡는 편이 좋아요.";
  if (level === "busy") return "주요 동선이 붐빌 수 있어 여유 있는 이동 계획이 필요해요.";
  if (level === "normal") return "활기 있는 수준이며 대부분의 동선을 무난하게 이용할 수 있어요.";
  return "현재 비교적 여유로워 편안하게 둘러보기 좋은 상태예요.";
}

function forecastFor(min: number, max: number, level: CrowdLevel, seed: number): ForecastPoint[] {
  const multipliers = [1, 1.04, 1.09, 1.13, 1.08, 0.98];
  return multipliers.map((multiplier, index) => {
    const shifted = multiplier + (((seed >> (index % 8)) & 3) - 1) * 0.012;
    const pointMin = Math.max(500, Math.round((min * shifted) / 100) * 100);
    const pointMax = Math.max(pointMin + 500, Math.round((max * shifted) / 100) * 100);
    return {
      label: index === 0 ? "지금" : `+${index}h`,
      min: pointMin,
      max: pointMax,
      level,
    };
  });
}

function genericDefinition(row: SeoulHotspotRow, index: number): PlaceDefinition {
  const meta = categoryMeta[row.category] ?? categoryMeta["발달상권"];
  const seed = hashText(row.area_nm);
  const override = overrides[row.area_nm];
  return {
    id: override?.slug ?? `seoul-spot-${String(index + 1).padStart(3, "0")}`,
    slug: override?.slug ?? `seoul-spot-${String(index + 1).padStart(3, "0")}`,
    name: row.area_nm,
    apiAreaName: row.area_nm,
    district: override?.district ?? "서울",
    latitude: Number(row.x),
    longitude: Number(row.y),
    summary: override?.summary ?? meta.summary,
    categories: override?.categories ?? meta.categories,
    tags: override?.tags ?? meta.tags,
    searchKeywords: override?.searchKeywords ?? [row.area_nm, row.category, "서울"],
    recommendationBase: override?.recommendationBase ?? 78 + (seed % 17),
  };
}

export const PLACE_DEFINITIONS: PlaceDefinition[] = (seoulHotspots as SeoulHotspotRow[]).map(genericDefinition);

const definitionsByArea = new Map(PLACE_DEFINITIONS.map((definition) => [definition.apiAreaName, definition]));

export const MOCK_PLACES: Place[] = (seoulHotspots as SeoulHotspotRow[]).map((row) => {
  const definition = definitionsByArea.get(row.area_nm);
  if (!definition) throw new Error(`Missing place definition for ${row.area_nm}`);
  const seed = hashText(row.area_nm);
  const level = crowdLevel(row.area_congest_lvl);
  const meta = categoryMeta[row.category] ?? categoryMeta["발달상권"];
  const factor = level === "veryBusy" ? 1.55 : level === "busy" ? 1.28 : level === "normal" ? 1.05 : 0.78;
  const minPopulation = Math.max(
    800,
    Math.round(((meta.populationBase + (seed % 5200)) * factor) / 100) * 100,
  );
  const maxPopulation = minPopulation + 900 + (seed % 2300);
  const trend: CrowdTrend = seed % 3 === 0 ? "rising" : seed % 3 === 1 ? "stable" : "falling";
  return {
    ...definition,
    crowd: {
      level,
      minPopulation,
      maxPopulation,
      message: crowdMessage(level),
      trend,
      measuredAt: "공식 주요 장소 목록 기반 데모",
      source: "mock",
      forecast: forecastFor(minPopulation, maxPopulation, level, seed),
    },
  };
});

export function getMockPlace(slug: string): Place | undefined {
  return MOCK_PLACES.find((item) => item.slug === slug);
}
