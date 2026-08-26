"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CompassIcon, ListIcon, MapIcon, RefreshIcon, SearchIcon, SparklesIcon } from "@/components/icons";
import { CrowdMap } from "@/components/CrowdMap";
import { PlaceCard } from "@/components/PlaceCard";
import { CROWD_META } from "@/lib/crowd";
import { haversineDistanceKm } from "@/lib/geo";
import { scorePlace, type RecommendationIntent } from "@/lib/recommendation";
import type { Place, PlacesPayload, RankedPlace } from "@/types/place";

const filters: Array<{ value: RecommendationIntent; label: string; icon: string }> = [
  { value: "all", label: "전체", icon: "✦" },
  { value: "date", label: "데이트", icon: "♡" },
  { value: "walk", label: "산책", icon: "♧" },
  { value: "hotspot", label: "핫플", icon: "●" },
  { value: "quiet", label: "한적한 곳", icon: "☁" },
  { value: "family", label: "아이와", icon: "⌂" },
  { value: "night", label: "야간", icon: "☾" },
  { value: "photo", label: "사진", icon: "◇" },
];

type SortOption = "recommended" | "relaxed" | "busy" | "distance";
type MobileView = "list" | "map";

export function PlaceExplorer({ initialPlaces }: { initialPlaces: Place[] }) {
  const [places, setPlaces] = useState(initialPlaces);
  const [mode, setMode] = useState<PlacesPayload["mode"]>("mock");
  const [notice, setNotice] = useState("API 키 없이도 전체 UI를 확인할 수 있는 데모 모드입니다.");
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<RecommendationIntent>("all");
  const [sort, setSort] = useState<SortOption>("recommended");
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [selectedSlug, setSelectedSlug] = useState(initialPlaces[0]?.slug);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number }>();
  const [locationMessage, setLocationMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const loadPlaces = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const response = await fetch("/api/places", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as PlacesPayload;
      setPlaces(payload.places);
      setMode(payload.mode);
      setNotice(payload.notice ?? "장소 데이터를 갱신했습니다.");
    } catch {
      setNotice("데이터 갱신에 실패해 마지막으로 확인한 화면을 유지하고 있습니다.");
    } finally {
      if (manual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPlaces();
    const interval = window.setInterval(() => void loadPlaces(), 60_000);
    return () => window.clearInterval(interval);
  }, [loadPlaces]);

  const rankedPlaces = useMemo<RankedPlace[]>(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    const crowdOrder = { relaxed: 0, normal: 1, busy: 2, veryBusy: 3 } as const;

    const enriched = places
      .map((place) => {
        const distanceKm = location
          ? haversineDistanceKm(location, {
              latitude: place.latitude,
              longitude: place.longitude,
            })
          : undefined;
        return {
          ...place,
          distanceKm,
          score: scorePlace(place, intent, distanceKm),
        };
      })
      .filter((place) => {
        if (intent !== "all" && !place.categories.includes(intent)) return false;
        if (!normalizedQuery) return true;
        const haystack = [
          place.name,
          place.apiAreaName,
          place.district,
          place.summary,
          ...place.tags,
          ...place.searchKeywords,
        ]
          .join(" ")
          .toLocaleLowerCase("ko-KR");
        return haystack.includes(normalizedQuery);
      });

    return enriched.sort((a, b) => {
      if (sort === "relaxed") return crowdOrder[a.crowd.level] - crowdOrder[b.crowd.level] || b.score - a.score;
      if (sort === "busy") return crowdOrder[b.crowd.level] - crowdOrder[a.crowd.level] || b.score - a.score;
      if (sort === "distance") {
        return (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY);
      }
      return b.score - a.score;
    });
  }, [intent, location, places, query, sort]);

  useEffect(() => {
    if (rankedPlaces.length === 0) return;
    if (!rankedPlaces.some((place) => place.slug === selectedSlug)) {
      setSelectedSlug(rankedPlaces[0].slug);
    }
  }, [rankedPlaces, selectedSlug]);

  const locate = () => {
    if (!navigator.geolocation) {
      setLocationMessage("이 브라우저는 위치 기능을 지원하지 않아요.");
      return;
    }

    setIsLocating(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setSort("distance");
        setLocationMessage("현재 위치에서 가까운 순서로 정렬했어요.");
        setIsLocating(false);
      },
      () => {
        setLocationMessage("위치 권한을 허용하면 가까운 장소를 계산할 수 있어요.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 },
    );
  };

  const relaxedCount = places.filter((place) => place.crowd.level === "relaxed").length;
  const busyCount = places.filter((place) => place.crowd.level === "veryBusy").length;
  const topPlace = rankedPlaces[0];
  const modeLabel = mode === "live" ? "서울 실데이터" : mode === "mixed" ? "실데이터 + fallback" : "데모 데이터";

  return (
    <main className="explorer-page">
      <section className="explorer-hero">
        <div className="explorer-hero__copy">
          <span className="eyebrow"><SparklesIcon /> 서울 실시간 장소 추천</span>
          <h1>지금 어디 갈까요?</h1>
          <p>사람이 얼마나 많은지, 내 목적에 잘 맞는지 한 화면에서 비교해보세요.</p>

          <div className="search-box">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="성수, 홍대, 서울숲을 검색해보세요"
              aria-label="장소 검색"
            />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기">×</button>}
          </div>

          <div className="filter-row" aria-label="추천 목적 필터">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={intent === filter.value ? "is-active" : ""}
                onClick={() => setIntent(filter.value)}
              >
                <span>{filter.icon}</span>{filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hero-insight-card">
          <div className="hero-insight-card__glow" />
          <span className="hero-insight-card__label">오늘의 첫 추천</span>
          <strong>{topPlace?.name ?? "조건에 맞는 장소를 찾는 중"}</strong>
          <p>{topPlace ? `${topPlace.score}점 · ${CROWD_META[topPlace.crowd.level].label}` : "검색 조건을 바꿔보세요."}</p>
          <div className="hero-insight-card__stats">
            <span><b>{relaxedCount}</b>여유로운 곳</span>
            <span><b>{places.length}</b>비교 장소</span>
            <span><b>{busyCount}</b>매우 붐빔</span>
          </div>
        </div>
      </section>

      <div className="data-notice" role="status">
        <span className={`data-mode data-mode--${mode}`}><i />{modeLabel}</span>
        <p>{notice}</p>
        <button type="button" onClick={() => void loadPlaces(true)} disabled={isRefreshing}>
          <RefreshIcon className={isRefreshing ? "is-spinning" : ""} /> 새로고침
        </button>
      </div>

      <div className="mobile-view-switch" aria-label="보기 방식">
        <button type="button" className={mobileView === "list" ? "is-active" : ""} onClick={() => setMobileView("list")}>
          <ListIcon /> 추천
        </button>
        <button type="button" className={mobileView === "map" ? "is-active" : ""} onClick={() => setMobileView("map")}>
          <MapIcon /> 지도
        </button>
      </div>

      <section className="explorer-workspace">
        <aside className={`place-panel${mobileView === "list" ? " is-mobile-visible" : ""}`}>
          <div className="place-panel__toolbar">
            <div>
              <span className="section-kicker">추천 장소</span>
              <h2>{rankedPlaces.length}곳을 찾았어요</h2>
            </div>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} aria-label="정렬 방식">
              <option value="recommended">추천순</option>
              <option value="relaxed">여유순</option>
              <option value="busy">붐빔순</option>
              <option value="distance" disabled={!location}>가까운순</option>
            </select>
          </div>

          <button type="button" className="nearby-button" onClick={locate} disabled={isLocating}>
            <CompassIcon />
            <span><strong>{isLocating ? "현재 위치 확인 중" : "내 주변에서 찾아보기"}</strong><small>{locationMessage || "위치 권한은 브라우저 안에서만 사용해요."}</small></span>
          </button>

          <div className="place-list">
            {rankedPlaces.map((place) => (
              <PlaceCard
                key={place.slug}
                place={place}
                selected={selectedSlug === place.slug}
                onSelect={(slug) => {
                  setSelectedSlug(slug);
                  if (window.innerWidth < 900) setMobileView("map");
                }}
              />
            ))}
            {rankedPlaces.length === 0 && (
              <div className="empty-results">
                <span>⌕</span>
                <h3>조건에 맞는 장소가 없어요</h3>
                <p>검색어를 줄이거나 다른 목적 필터를 선택해보세요.</p>
                <button type="button" onClick={() => { setQuery(""); setIntent("all"); }}>전체 장소 다시 보기</button>
              </div>
            )}
          </div>
        </aside>

        <div className={`map-panel${mobileView === "map" ? " is-mobile-visible" : ""}`}>
          <CrowdMap places={rankedPlaces} selectedSlug={selectedSlug} onSelect={setSelectedSlug} />
          <div className="map-overlay-card">
            <span>혼잡도 범례</span>
            {(["relaxed", "normal", "busy", "veryBusy"] as const).map((level) => (
              <i key={level}><b className={`legend-dot legend-dot--${level}`} />{CROWD_META[level].shortLabel}</i>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
