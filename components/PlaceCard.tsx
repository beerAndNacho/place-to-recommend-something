import Link from "next/link";
import { ArrowIcon, ClockIcon, PinIcon, UsersIcon } from "@/components/icons";
import { CrowdBadge } from "@/components/CrowdBadge";
import { formatPopulationRange, TREND_META } from "@/lib/crowd";
import { formatDistance } from "@/lib/geo";
import { recommendationLabel } from "@/lib/recommendation";
import type { RankedPlace } from "@/types/place";

function MiniTrend({ place }: { place: RankedPlace }) {
  const points = place.crowd.forecast.slice(0, 6);
  if (points.length < 2) return null;
  const values = points.map((point) => (point.min + point.max) / 2);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const coordinates = values
    .map((value, index) => {
      const x = 2 + (76 * index) / Math.max(1, values.length - 1);
      const y = 28 - ((value - min) / range) * 22;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className={`mini-trend mini-trend--${place.crowd.level}`} viewBox="0 0 80 32" aria-hidden="true">
      <polyline points={coordinates} />
    </svg>
  );
}

export function PlaceCard({
  place,
  selected,
  onSelect,
}: {
  place: RankedPlace;
  selected: boolean;
  onSelect: (slug: string) => void;
}) {
  const trend = TREND_META[place.crowd.trend];

  return (
    <article className={`place-card${selected ? " place-card--selected" : ""}`}>
      <button className="place-card__select" type="button" onClick={() => onSelect(place.slug)}>
        <div className="place-card__topline">
          <div>
            <div className="place-card__location"><PinIcon />{place.district}</div>
            <h3>{place.name}</h3>
          </div>
          <div className="place-score" aria-label={`추천 점수 ${place.score}점`}>
            <strong>{place.score}</strong><span>추천</span>
          </div>
        </div>

        <div className="place-card__status">
          <CrowdBadge level={place.crowd.level} />
          <span className="place-card__verdict">{recommendationLabel(place.score)}</span>
        </div>

        <p className="place-card__summary">{place.summary}</p>

        <div className="place-card__metrics">
          <span><UsersIcon />{formatPopulationRange(place.crowd.minPopulation, place.crowd.maxPopulation)}</span>
          <span><ClockIcon />{trend.symbol} {trend.label}</span>
          {typeof place.distanceKm === "number" && <span><PinIcon />{formatDistance(place.distanceKm)}</span>}
          <MiniTrend place={place} />
        </div>

        <div className="place-card__tags">
          {place.tags.map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
      </button>

      <Link className="place-card__link" href={`/place/${place.slug}`}>
        상세 정보 보기 <ArrowIcon />
      </Link>
    </article>
  );
}
