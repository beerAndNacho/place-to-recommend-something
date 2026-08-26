import { normalizeSeoulCrowdLevel } from "@/lib/crowd";
import type {
  CrowdLevel,
  CrowdTrend,
  ForecastPoint,
  Place,
  PlaceDefinition,
} from "@/types/place";

const SEOUL_OPEN_API_BASE = "http://openapi.seoul.go.kr:8088";

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function inferTrend(
  currentMin: number,
  currentMax: number,
  forecastPoints: ForecastPoint[],
): CrowdTrend {
  const firstFuture = forecastPoints[1] ?? forecastPoints[0];
  if (!firstFuture) return "stable";

  const currentMid = (currentMin + currentMax) / 2;
  const futureMid = (firstFuture.min + firstFuture.max) / 2;
  if (currentMid <= 0) return "stable";

  const ratio = (futureMid - currentMid) / currentMid;
  if (ratio >= 0.06) return "rising";
  if (ratio <= -0.06) return "falling";
  return "stable";
}

function forecastLabel(value: unknown, index: number): string {
  const text = String(value ?? "").trim();
  if (!text) return index === 0 ? "지금" : `+${index}h`;
  const time = text.match(/(\d{1,2}):(\d{2})/);
  return time ? `${time[1].padStart(2, "0")}:${time[2]}` : text;
}

interface RawForecast {
  FCST_TIME?: unknown;
  FCST_CONGEST_LVL?: unknown;
  FCST_PPLTN_MIN?: unknown;
  FCST_PPLTN_MAX?: unknown;
}

interface RawPopulationRow {
  AREA_CONGEST_LVL?: unknown;
  AREA_CONGEST_MSG?: unknown;
  AREA_PPLTN_MIN?: unknown;
  AREA_PPLTN_MAX?: unknown;
  PPLTN_TIME?: unknown;
  FCST_PPLTN?: { FCST_PPLTN?: RawForecast | RawForecast[] } | RawForecast | RawForecast[];
}

function getRows(payload: unknown): RawPopulationRow[] {
  if (!payload || typeof payload !== "object") return [];
  const object = payload as Record<string, unknown>;
  const result = object.RESULT as { CODE?: string; MESSAGE?: string } | undefined;
  if (result?.CODE && result.CODE !== "INFO-000") {
    throw new Error(`Seoul API returned ${result.CODE}: ${result.MESSAGE ?? "unknown error"}`);
  }

  const rows = object["SeoulRtd.citydata_ppltn"];
  return asArray(rows as RawPopulationRow | RawPopulationRow[] | undefined);
}

function buildForecast(row: RawPopulationRow): ForecastPoint[] {
  const container = row.FCST_PPLTN;
  let raw: RawForecast[] = [];

  if (Array.isArray(container)) {
    raw = container;
  } else if (container && typeof container === "object" && "FCST_PPLTN" in container) {
    raw = asArray((container as { FCST_PPLTN?: RawForecast | RawForecast[] }).FCST_PPLTN);
  } else if (container && typeof container === "object") {
    raw = [container as RawForecast];
  }

  return raw
    .map((point, index) => {
      const min = asNumber(point.FCST_PPLTN_MIN);
      const max = asNumber(point.FCST_PPLTN_MAX);
      if (min === null || max === null) return null;
      return {
        label: forecastLabel(point.FCST_TIME, index),
        at: String(point.FCST_TIME ?? ""),
        min,
        max,
        level: normalizeSeoulCrowdLevel(point.FCST_CONGEST_LVL),
      } satisfies ForecastPoint;
    })
    .filter((point): point is NonNullable<typeof point> => point !== null)
    .slice(0, 8);
}

export async function fetchLivePlace(
  definition: PlaceDefinition,
  fallback: Place,
  apiKey: string,
  cacheSeconds: number,
): Promise<Place> {
  const url = [
    SEOUL_OPEN_API_BASE,
    encodeURIComponent(apiKey),
    "json",
    "citydata_ppltn",
    "1",
    "5",
    encodeURIComponent(definition.apiAreaName),
  ].join("/");

  const response = await fetch(url, {
    next: {
      revalidate: cacheSeconds,
      tags: [`seoul-crowd:${definition.slug}`],
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Seoul API HTTP ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  const row = getRows(payload)[0];
  if (!row) throw new Error("Seoul API returned no population row");

  const minPopulation = asNumber(row.AREA_PPLTN_MIN);
  const maxPopulation = asNumber(row.AREA_PPLTN_MAX);
  if (minPopulation === null || maxPopulation === null) {
    throw new Error("Seoul API population range is missing");
  }

  const level: CrowdLevel = normalizeSeoulCrowdLevel(row.AREA_CONGEST_LVL);
  const apiForecast = buildForecast(row);
  const forecastPoints =
    apiForecast.length > 0
      ? apiForecast
      : [
          {
            label: "지금",
            min: minPopulation,
            max: maxPopulation,
            level,
          },
          ...fallback.crowd.forecast.slice(1),
        ];

  return {
    ...definition,
    crowd: {
      level,
      minPopulation,
      maxPopulation,
      message:
        String(row.AREA_CONGEST_MSG ?? "").trim() ||
        `${definition.name}의 현재 혼잡도를 확인했어요.`,
      trend: inferTrend(minPopulation, maxPopulation, forecastPoints),
      measuredAt: String(row.PPLTN_TIME ?? "").trim() || new Date().toISOString(),
      source: "seoul",
      forecast: forecastPoints,
    },
  };
}
