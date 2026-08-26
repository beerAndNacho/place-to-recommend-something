import type { Metadata } from "next";
import { PlaceExplorer } from "@/components/PlaceExplorer";
import { MOCK_PLACES } from "@/data/places";

export const metadata: Metadata = {
  title: "서울 실시간 혼잡도 탐색",
  description: "서울숲, 성수, 홍대, 강남역 등 주요 장소의 현재 혼잡도와 추천 점수를 비교합니다.",
  alternates: { canonical: "/crowd" },
};

export default function CrowdPage() {
  return <PlaceExplorer initialPlaces={MOCK_PLACES} />;
}
