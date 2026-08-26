import "server-only";

import { MOCK_PLACES, PLACE_DEFINITIONS, getMockPlace } from "@/data/places";
import { fetchLivePlace } from "@/lib/seoul-api";
import type { Place, PlacesPayload } from "@/types/place";

function integerEnv(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function mockPayload(notice?: string): PlacesPayload {
  return {
    mode: "mock",
    updatedAt: new Date().toISOString(),
    places: MOCK_PLACES,
    notice:
      notice ??
      "SEOUL_API_KEY가 없어 기획 검증용 데모 데이터를 표시하고 있습니다.",
    liveCount: 0,
    fallbackCount: 0,
  };
}

export async function getPlacesPayload(): Promise<PlacesPayload> {
  const apiKey = process.env.SEOUL_API_KEY?.trim();
  if (!apiKey) return mockPayload();

  const cacheSeconds = integerEnv("SEOUL_API_CACHE_SECONDS", 900, 60, 86_400);
  const liveLimit = integerEnv(
    "SEOUL_LIVE_PLACE_LIMIT",
    Math.min(10, PLACE_DEFINITIONS.length),
    1,
    PLACE_DEFINITIONS.length,
  );

  const targets = PLACE_DEFINITIONS.slice(0, liveLimit);
  const results = await Promise.allSettled(
    targets.map((definition) => {
      const fallback = getMockPlace(definition.slug);
      if (!fallback) throw new Error(`Missing mock data for ${definition.slug}`);
      return fetchLivePlace(definition, fallback, apiKey, cacheSeconds);
    }),
  );

  const liveBySlug = new Map<string, Place>();
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      liveBySlug.set(targets[index].slug, result.value);
    } else {
      console.warn(`[seoul-api] ${targets[index].slug}: ${result.reason instanceof Error ? result.reason.message : "unknown error"}`);
    }
  });

  const places = MOCK_PLACES.map((mock) => {
    const live = liveBySlug.get(mock.slug);
    if (live) return live;
    if (targets.some((target) => target.slug === mock.slug)) {
      return {
        ...mock,
        crowd: { ...mock.crowd, source: "fallback" as const },
      };
    }
    return mock;
  });

  const liveCount = liveBySlug.size;
  const fallbackCount = targets.length - liveCount;
  if (liveCount === 0) {
    return mockPayload(
      "서울 API 호출에 실패해 데모 데이터로 안전하게 전환했습니다. 환경변수와 인증키 상태를 확인하세요.",
    );
  }

  return {
    mode: fallbackCount > 0 || liveLimit < PLACE_DEFINITIONS.length ? "mixed" : "live",
    updatedAt: new Date().toISOString(),
    places,
    liveCount,
    fallbackCount,
    notice:
      fallbackCount > 0
        ? `${liveCount}개 장소는 서울 실데이터, ${fallbackCount}개 장소는 fallback 데이터입니다.`
        : "서울 열린데이터광장의 실시간 인구 데이터를 사용 중입니다.",
  };
}

export async function getPlaceBySlug(
  slug: string,
): Promise<{ place: Place | undefined; payload: PlacesPayload }> {
  const fallback = getMockPlace(slug);
  const definition = PLACE_DEFINITIONS.find((item) => item.slug === slug);
  if (!fallback || !definition) {
    return { place: undefined, payload: mockPayload() };
  }

  const apiKey = process.env.SEOUL_API_KEY?.trim();
  if (!apiKey) {
    const payload = mockPayload();
    return { place: fallback, payload: { ...payload, places: [fallback] } };
  }

  const cacheSeconds = integerEnv("SEOUL_API_CACHE_SECONDS", 900, 60, 86_400);
  try {
    const live = await fetchLivePlace(definition, fallback, apiKey, cacheSeconds);
    return {
      place: live,
      payload: {
        mode: "live",
        updatedAt: new Date().toISOString(),
        places: [live],
        notice: "서울 열린데이터광장의 실시간 인구 데이터를 사용 중입니다.",
        liveCount: 1,
        fallbackCount: 0,
      },
    };
  } catch (error) {
    console.warn(
      `[seoul-api] ${slug}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    const place: Place = {
      ...fallback,
      crowd: { ...fallback.crowd, source: "fallback" },
    };
    return {
      place,
      payload: {
        mode: "mixed",
        updatedAt: new Date().toISOString(),
        places: [place],
        notice: "실데이터 호출에 실패해 이 장소만 fallback 데이터로 톜시합니다.",
        liveCount: 0,
        fallbackCount: 1,
      },
    };
  }
}
