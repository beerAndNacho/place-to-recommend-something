import type { CrowdLevel, CrowdTrend } from "@/types/place";

export const CROWD_META: Record<
  CrowdLevel,
  { label: string; shortLabel: string; description: string }
> = {
  relaxed: {
    label: "여유",
    shortLabel: "여유",
    description: "이동과 대기가 비교적 편안해요.",
  },
  normal: {
    label: "보통",
    shortLabel: "보통",
    description: "평소 수준의 활기가 있어요.",
  },
  busy: {
    label: "약간 붐빔",
    shortLabel: "약간 붐빔",
    description: "주요 동선에서 대기가 생길 수 있어요.",
  },
  veryBusy: {
    label: "붐빔",
    shortLabel: "붐빔",
    description: "혼잡을 피하고 싶다면 다른 후보도 살펴보세요.",
  },
};

export const TREND_META: Record<CrowdTrend, { label: string; symbol: string }> = {
  rising: { label: "사람이 늘고 있어요", symbol: "↗" },
  stable: { label: "비슷한 수준이에요", symbol: "→" },
  falling: { label: "조금씩 줄고 있어요", symbol: "↘" },
};

export function normalizeSeoulCrowdLevel(value: unknown): CrowdLevel {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.includes("약간") && text.includes("붐")) return "busy";
  if (text.includes("붐")) return "veryBusy";
  if (text.includes("보통")) return "normal";
  return "relaxed";
}

export function formatPopulation(value: number): string {
  if (!Number.isFinite(value)) return "-";
  if (value >= 10_000) {
    const compact = Math.round((value / 10_000) * 10) / 10;
    return `${compact.toLocaleString("ko-KR")}만`;
  }
  return value.toLocaleString("ko-KR");
}

export function formatPopulationRange(min: number, max: number): string {
  return `${formatPopulation(min)}~${formatPopulation(max)}명`;
}

export function getCrowdScore(level: CrowdLevel): number {
  return {
    relaxed: 34,
    normal: 26,
    busy: 15,
    veryBusy: 6,
  }[level];
}
