import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CrowdBadge } from "@/components/CrowdBadge";
import { CrowdMap } from "@/components/CrowdMap";
import { ForecastChart } from "@/components/ForecastChart";
import { ArrowIcon, ChevronLeftIcon, ClockIcon, PinIcon, SparklesIcon, UsersIcon } from "@/components/icons";
import { MOCK_PLACES, PLACE_DEFINITIONS } from "@/data/places";
import { SEOUL_API_KEY_COOKIE } from "@/lib/api-key-settings";
import { formatPopulationRange, TREND_META } from "@/lib/crowd";
import { getPlaceBySlug } from "@/lib/place-service";
import { recommendationLabel, scorePlace } from "@/lib/recommendation";
import type { RankedPlace } from "@/types/place";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return PLACE_DEFINITIONS.map((place) => ({ slug: place.slug }));
}

export async function generateMetadata(
  context: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await context.params;
  const place = MOCK_PLACES.find((item) => item.slug === slug);
  if (!place) return { title: "장소를 찾을 수 없음" };
  return {
    title: `${place.name} 실시간 혼잡도`,
    description: `${place.name}의 현재 혼잡도, 예상 인구, 시간대별 변화와 방문 추천 정보를 확인하세요.`,
    alternates: { canonical: `/place/${place.slug}` },
  };
}

export default async function PlaceDetailPage(
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const cookieStore = await cookies();
  const browserApiKey = cookieStore.get(SEOUL_API_KEY_COOKIE)?.value;
  const { place, payload } = await getPlaceBySlug(slug, browserApiKey);
  if (!place) notFound();

  const score = scorePlace(place, "all");
  const rankedPlace: RankedPlace = { ...place, score };
  const trend = TREND_META[place.crowd.trend];
  const similar = MOCK_PLACES
    .filter((item) => item.slug !== place.slug)
    .map((item) => ({
      item,
      overlap: item.categories.filter((category) => place.categories.includes(category)).length,
    }))
    .sort((a, b) => b.overlap - a.overlap || b.item.recommendationBase - a.item.recommendationBase)
    .slice(0, 3)
    .map(({ item }) => ({ ...item, score: scorePlace(item, "all") }));

  const sourceLabel = place.crowd.source === "seoul" ? "서울 실데이터" : place.crowd.source === "fallback" ? "Fallback 데이터" : "데모 데이터";
  const reasons = [
    place.crowd.level === "relaxed" || place.crowd.level === "normal"
      ? "현재 이동과 대기가 비교적 편안한 수준이에요."
      : "현재 혼잡도가 높아 주요 동선의 대기를 고려해야 해요.",
    place.crowd.trend === "falling"
      ? "앞으로는 지금보다 조금 더 여유로워질 가능성이 있어요."
      : place.crowd.trend === "rising"
        ? "시간이 지나며 사람이 늘 수 있어 지금 출발하는 편이 유리해요."
        : "당분간 비슷한 혼잡도가 이어질 가능성이 있어요.",
    `${place.tags.slice(0, 2).join("·")} 목적과 잘 맞는 장소예요.`,
  ];

  return (
    <main className="detail-page">
      <div className="detail-container">
        <Link href="/crowd" className="back-link"><ChevronLeftIcon /> 장소 목록</Link>

        <section className="detail-hero">
          <div className="detail-hero__copy">
            <div className="detail-location"><PinIcon />{place.district}</div>
            <h1>{place.name}</h1>
            <p>{place.summary}</p>
            <div className="detail-badges">
              <CrowdBadge level={place.crowd.level} />
              {place.tags.map((tag) => <span key={tag}>#{tag}</span>)}
            </div>
          </div>
          <div className="detail-score-card">
            <span><SparklesIcon /> 현재 추천</span>
            <strong>{score}</strong>
            <p>{recommendationLabel(score)}</p>
          </div>
        </section>

        <section className="detail-overview-grid">
          <div className="metric-card">
            <span><UsersIcon /> 예상 인구</span>
            <strong>{formatPopulationRange(place.crowd.minPopulation, place.crowd.maxPopulation)}</strong>
            <small>범위형 추정값</small>
          </div>
          <div className="metric-card">
            <span><ClockIcon /> 변화 흐름</span>
            <strong>{trend.symbol} {trend.label}</strong>
            <small>{place.crowd.measuredAt}</small>
          </div>
          <div className="metric-card">
            <span><PinIcon /> 데이터 상태</span>
            <strong>{sourceLabel}</strong>
            <small>{payload.mode === "mixed" ? "일부 장소 fallback" : "장소별 상태"}</small>
          </div>
        </section>

        <section className="detail-section detail-section--message">
          <div>
            <span className="section-kicker">현재 상황</span>
            <h2>지금 가도 괜찮을까요?</h2>
          </div>
          <blockquote>{place.crowd.message}</blockquote>
        </section>

        <section className="detail-two-column">
          <div className="detail-section">
            <span className="section-kicker">추천 근거</span>
            <h2>이렇게 판단했어요</h2>
            <div className="reason-list">
              {reasons.map((reason, index) => (
                <div key={reason}><span>{index + 1}</span><p>{reason}</p></div>
              ))}
            </div>
          </div>
          <div className="detail-map-card">
            <CrowdMap places={[rankedPlace]} selectedSlug={place.slug} compact />
          </div>
        </section>

        <section className="detail-section">
          <span className="section-kicker">시간대별 전망</span>
          <h2>앞으로 혼잡도는 이렇게 바뀔 수 있어요</h2>
          <p className="section-description">실데이터 예측이 없을 때는 화면 검증용 시나리오를 표시합니다.</p>
          <ForecastChart points={place.crowd.forecast} />
        </section>

        <section className="detail-section">
          <span className="section-kicker">비슷한 장소</span>
          <h2>다른 후보도 비교해보세요</h2>
          <div className="similar-grid">
            {similar.map((item) => (
              <Link href={`/place/${item.slug}`} key={item.slug}>
                <div><CrowdBadge level={item.crowd.level} compact /><span>{item.district}</span></div>
                <h3>{item.name}</h3>
                <p>{item.summary}</p>
                <strong>추천 {item.score} <ArrowIcon /></strong>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
