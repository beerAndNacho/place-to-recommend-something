import { getCrowdScore } from "@/lib/crowd";
import type { Place, PlaceCategory } from "@/types/place";

export type RecommendationIntent = "all" | PlaceCategory;

export function scorePlace(
  place: Place,
  intent: RecommendationIntent,
  distanceKm?: number,
): number {
  let score = Math.round(place.recommendationBase * 0.56 + getCrowdScore(place.crowd.level));

  if (intent !== "all") {
    score += place.categories.includes(intent) ? 12 : -7;
  }

  if (place.crowd.trend === "falling") score += 4;
  if (place.crowd.trend === "rising" && place.crowd.level === "veryBusy") score -= 5;

  if (typeof distanceKm === "number") {
    if (distanceKm <= 2) score += 7;
    else if (distanceKm <= 5) score += 4;
    else if (distanceKm >= 15) score -= 5;
  }

  return Math.max(45, Math.min(99, score));
}

export function recommendationLabel(score: number): string {
  if (score >= 91) return "지금 가기 아주 좋아요";
  if (score >= 84) return "지금 방문하기 좋아요";
  if (score >= 76) return "목적에 따라 괜찮아요";
  if (score >= 66) return "혼잡을 확인하고 가세요";
  return "다른 후보와 비교해보세요";
}
