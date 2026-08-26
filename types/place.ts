export type CrowdLevel = "relaxed" | "normal" | "busy" | "veryBusy";

export type CrowdTrend = "rising" | "stable" | "falling";

export type PlaceCategory =
  | "date"
  | "walk"
  | "hotspot"
  | "quiet"
  | "night"
  | "photo"
  | "family";

export type CrowdSource = "mock" | "seoul" | "fallback";

export interface ForecastPoint {
  label: string;
  at?: string;
  min: number;
  max: number;
  level: CrowdLevel;
}

export interface CrowdSnapshot {
  level: CrowdLevel;
  minPopulation: number;
  maxPopulation: number;
  message: string;
  trend: CrowdTrend;
  measuredAt: string;
  source: CrowdSource;
  forecast: ForecastPoint[];
}

export interface PlaceDefinition {
  id: string;
  slug: string;
  name: string;
  apiAreaName: string;
  district: string;
  latitude: number;
  longitude: number;
  summary: string;
  categories: PlaceCategory[];
  tags: string[];
  searchKeywords: string[];
  recommendationBase: number;
}

export interface Place extends PlaceDefinition {
  crowd: CrowdSnapshot;
}

export interface RankedPlace extends Place {
  score: number;
  distanceKm?: number;
}

export interface PlacesPayload {
  mode: "mock" | "live" | "mixed";
  updatedAt: string;
  places: Place[];
  notice?: string;
  liveCount: number;
  fallbackCount: number;
}
