import { CROWD_META } from "@/lib/crowd";
import type { ForecastPoint } from "@/types/place";

function midpoint(point: ForecastPoint): number {
  return (point.min + point.max) / 2;
}

export function ForecastChart({ points }: { points: ForecastPoint[] }) {
  if (points.length === 0) {
    return <div className="empty-chart">예측 데이터가 아직 없어요.</div>;
  }

  const values = points.map(midpoint);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const width = 640;
  const height = 220;
  const paddingX = 28;
  const paddingY = 26;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const coordinates = values.map((value, index) => {
    const x = paddingX + (usableWidth * index) / Math.max(1, points.length - 1);
    const y = paddingY + usableHeight - ((value - min) / range) * usableHeight;
    return { x, y };
  });

  const path = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const areaPath = `${paddingX},${height - paddingY} ${path} ${width - paddingX},${height - paddingY}`;

  return (
    <div className="forecast-chart-wrap">
      <svg
        className="forecast-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="시간대별 예상 인구 변화"
      >
        <defs>
          <linearGradient id="forecast-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = paddingY + (usableHeight * line) / 3;
          return <line key={line} x1={paddingX} x2={width - paddingX} y1={y} y2={y} className="forecast-chart__grid" />;
        })}
        <polygon points={areaPath} fill="url(#forecast-area)" />
        <polyline points={path} className="forecast-chart__line" />
        {coordinates.map(({ x, y }, index) => (
          <g key={`${points[index].label}-${index}`}>
            <circle cx={x} cy={y} r={index === 0 ? 6 : 4.5} className={`forecast-chart__point forecast-chart__point--${points[index].level}`} />
            <text x={x} y={height - 7} textAnchor="middle" className="forecast-chart__label">
              {points[index].label}
            </text>
          </g>
        ))}
      </svg>
      <div className="forecast-legend" aria-label="혼잡도 범례">
        {(["relaxed", "normal", "busy", "veryBusy"] as const).map((level) => (
          <span key={level}><i className={`legend-dot legend-dot--${level}`} />{CROWD_META[level].label}</span>
        ))}
      </div>
    </div>
  );
}
