"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CompassIcon, RefreshIcon, SearchIcon } from "@/components/icons";
import { CrowdMap } from "@/components/CrowdMap";
import { CROWD_META, formatPopulationRange } from "@/lib/crowd";
import { haversineDistanceKm } from "@/lib/geo";
import { scorePlace, type RecommendationIntent } from "@/lib/recommendation";
import type { CrowdLevel, Place, PlaceCategory, PlacesPayload, RankedPlace } from "@/types/place";

const crowdLevels: CrowdLevel[] = ["relaxed", "normal", "busy", "veryBusy"];
const crowdRank: Record<CrowdLevel, number> = {
  relaxed: 0,
  normal: 1,
  busy: 2,
  veryBusy: 3,
};

const presets: Array<{ value: RecommendationIntent; label: string; icon: string }> = [
  { value: "family", label: "아이와 나들이", icon: "🧒" },
  { value: "date", label: "데이트", icon: "💐" },
  { value: "hotspot", label: "지금 핫플", icon: "🔥" },
  { value: "quiet", label: "한적한 곳", icon: "☁" },
];

const categories: Array<{ value: "all" | PlaceCategory; label: string }> = [
  { value: "all", label: "전체" },
  { value: "walk", label: "공원·산책" },
  { value: "hotspot", label: "상권·핫플" },
  { value: "photo", label: "문화·사진" },
  { value: "night", label: "야간" },
  { value: "family", label: "가족" },
];

type SortOption = "busy" | "relaxed" | "name" | "distance";

function placeType(place: Place): string {
  if (place.categories.includes("walk") || place.categories.includes("quiet")) return "공원·산책";
  if (place.categories.includes("hotspot")) return "발달상권";
  if (place.categories.includes("photo")) return "문화·관광";
  return "인구밀집지역";
}

function formatClock(value?: string): string {
  const parsed = value ? new Date(value) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function PlaceExplorer({ initialPlaces }: { initialPlaces: Place[] }) {
  const [places, setPlaces] = useState(initialPlaces);
  const [mode, setMode] = useState<PlacesPayload["mode"]>("mock");
  const [notice, setNotice] = useState("API 키 없이 동작하는 데모 데이터입니다.");
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<RecommendationIntent>("all");
  const [category, setCategory] = useState<"all" | PlaceCategory>("all");
  const [levels, setLevels] = useState<Set<CrowdLevel>>(new Set());
  const [sort, setSort] = useState<SortOption>("busy");
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showLabels, setShowLabels] = useState(true);
  const [patternMode, setPatternMode] = useState(false);
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
      setUpdatedAt(payload.updatedAt);
      setNotice(payload.notice ?? "장소 데이터를 갱신했습니다.");
    } catch {
      setNotice("데이터 갱신에 실패해 마지막으로 확인한 정보를 표시합니다.");
    } finally {
      if (manual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPlaces();
    const interval = window.setInterval(() => void loadPlaces(), 60_000);
    return () => window.clearInterval(interval);
  }, [loadPlaces]);

  const counts = useMemo(() => {
    return crowdLevels.reduce<Record<CrowdLevel, number>>(
      (acc, level) => {
        acc[level] = places.filter((place) => place.crowd.level === level).length;
        return acc;
      },
      { relaxed: 0, normal: 0, busy: 0, veryBusy: 0 },
    );
  }, [places]);

  const filteredPlaces = useMemo<RankedPlace[]>(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");

    return places
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
        if (category !== "all" && !place.categories.includes(category)) return false;
        if (levels.size > 0 && !levels.has(place.crowd.level)) return false;
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
      })
      .sort((a, b) => {
        if (sort === "busy") return crowdRank[b.crowd.level] - crowdRank[a.crowd.level] || b.score - a.score;
        if (sort === "relaxed") return crowdRank[a.crowd.level] - crowdRank[b.crowd.level] || b.score - a.score;
        if (sort === "name") return a.name.localeCompare(b.name, "ko-KR");
        return (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY);
      });
  }, [category, intent, levels, location, places, query, sort]);

  const selectedPlace = filteredPlaces.find((place) => place.slug === selectedSlug)
    ?? places.find((place) => place.slug === selectedSlug);

  const toggleLevel = (level: CrowdLevel) => {
    setLevels((current) => {
      const next = new Set(current);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const toggleFavorite = (slug: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setLocationMessage("이 브라우저에서는 위치 기능을 사용할 수 없습니다.");
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
        setLocationMessage("현재 위치에서 가까운 순서로 정렬했습니다.");
        setIsLocating(false);
      },
      () => {
        setLocationMessage("위치 권한을 허용하면 가까운 장소를 계산할 수 있습니다.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 },
    );
  };

  const clearFilters = () => {
    setIntent("all");
    setCategory("all");
    setLevels(new Set<CrowdLevel>());
    setQuery("");
  };

  const modeLabel = mode === "live" ? "서울 실시간 데이터" : mode === "mixed" ? "실시간 + 대체 데이터" : "데모 데이터";

  return (
    <main className="radar-page">
      <div className={`radar-alert radar-alert--${mode}`} role="status">
        <span aria-hidden>△</span>
        <strong>{modeLabel}</strong>
        <p>{notice}</p>
        <button type="button" onClick={() => void loadPlaces(true)} disabled={isRefreshing}>
          <RefreshIcon className={isRefreshing ? "is-spinning" : ""} />
          갱신
        </button>
      </div>

      <section className="radar-workspace">
        <aside className="radar-sidebar" aria-label="서울 장소 목록과 필터">
          <div className="radar-search-row">
            <label className="radar-search">
              <SearchIcon />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="명소·주소 검색 (예: 성수, 서울숲)"
                aria-label="장소 검색"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기">×</button>
              )}
            </label>
            <button type="button" className="radar-nearby" onClick={locate} disabled={isLocating}>
              <CompassIcon />
              {isLocating ? "확인 중" : "내 주변"}
            </button>
          </div>
          {locationMessage && <p className="radar-location-message">{locationMessage}</p>}

          <div className="radar-chip-strip radar-chip-strip--presets" aria-label="목적별 빠른 필터">
            <button type="button" className="radar-chip radar-chip--spark">✣ MBTI 추천</button>
            {presets.map((preset) => (
              <button
                type="button"
                key={preset.value}
                className={`radar-chip${intent === preset.value ? " is-active" : ""}`}
                aria-pressed={intent === preset.value}
                onClick={() => setIntent(intent === preset.value ? "all" : preset.value)}
              >
                <span aria-hidden>{preset.icon}</span>{preset.label}
              </button>
            ))}
          </div>

          <div className="radar-chip-strip radar-chip-strip--levels" aria-label="혼잡도 필터">
            {crowdLevels.map((level) => (
              <button
                type="button"
                key={level}
                className={`radar-level-chip radar-level-chip--${level}${levels.has(level) ? " is-active" : ""}`}
                aria-pressed={levels.has(level)}
                onClick={() => toggleLevel(level)}
              >
                <i />
                {CROWD_META[level].shortLabel}
                <b>{counts[level]}</b>
              </button>
            ))}
            {(intent !== "all" || category !== "all" || levels.size > 0 || query) && (
              <button type="button" className="radar-clear" onClick={clearFilters}>초기화</button>
            )}
          </div>

          <div className="radar-category-row">
            <div className="radar-category-scroll" aria-label="장소 유형">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={`radar-category${category === item.value ? " is-active" : ""}`}
                  aria-pressed={category === item.value}
                  onClick={() => setCategory(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} aria-label="정렬 방식">
              <option value="busy">붐빔순</option>
              <option value="relaxed">여유순</option>
              <option value="name">가나다</option>
              <option value="distance" disabled={!location}>가까운순</option>
            </select>
          </div>

          <div className="radar-list-head">
            <span>서울 주요 장소 {filteredPlaces.length}곳</span>
            <span>{formatClock(updatedAt)} 기준</span>
          </div>

          <div className="radar-list" role="list">
            {filteredPlaces.map((place, index) => {
              const selected = selectedSlug === place.slug;
              const favorite = favorites.has(place.slug);
              return (
                <article
                  key={place.slug}
                  className={`radar-row${selected ? " is-selected" : ""}`}
                  role="listitem"
                >
                  <button
                    type="button"
                    className="radar-row__main"
                    onClick={() => setSelectedSlug(place.slug)}
                  >
                    <span className="radar-row__index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="radar-row__copy">
                      <strong>{place.name}</strong>
                      <small>
                        {placeType(place)}
                        <span>·</span>
                        {place.district}
                        {place.distanceKm != null && <><span>·</span>{place.distanceKm.toFixed(1)}km</>}
                      </small>
                    </span>
                    <span className="radar-row__population">{formatPopulationRange(place.crowd.minPopulation, place.crowd.maxPopulation)}</span>
                    <span className={`radar-badge radar-badge--${place.crowd.level}`}>
                      {CROWD_META[place.crowd.level].shortLabel}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`radar-favorite${favorite ? " is-active" : ""}`}
                    onClick={() => toggleFavorite(place.slug)}
                    aria-label={`${place.name} ${favorite ? "즐겨찾기 해제" : "즐겨찾기"}`}
                  >
                    {favorite ? "★" : "☆"}
                  </button>
                </article>
              );
            })}

            {filteredPlaces.length === 0 && (
              <div className="radar-empty">
                <strong>조건에 맞는 장소가 없습니다.</strong>
                <p>검색어 또는 혼잡도 필터를 줄여보세요.</p>
                <button type="button" onClick={clearFilters}>전체 장소 보기</button>
              </div>
            )}
          </div>

          <footer className="radar-source">
            <span>서울 열린데이터광장 연동 준비 · 현재 {modeLabel}</span>
            <a href="https://github.com/beerAndNacho/place-to-recommend-something" target="_blank" rel="noreferrer">GitHub ↗</a>
          </footer>
        </aside>

        <section id="radar-map" className={`radar-map-pane${patternMode ? " is-pattern" : ""}`} aria-label="서울 혼잡도 지도">
          <CrowdMap
            places={filteredPlaces}
            selectedSlug={selectedSlug}
            onSelect={setSelectedSlug}
            showLabels={showLabels}
          />

          <div className="radar-map-tools">
            <button type="button" className={showLabels ? "is-active" : ""} onClick={() => setShowLabels((value) => !value)}>
              ◉ 이름표
            </button>
            <button type="button" className={patternMode ? "is-active" : ""} onClick={() => setPatternMode((value) => !value)}>
              ◷ 시간대 패턴
            </button>
          </div>

          <div className="radar-map-legend" aria-label="혼잡도 범례">
            {crowdLevels.map((level) => (
              <span key={level}><i className={`radar-dot radar-dot--${level}`} />{counts[level]}</span>
            ))}
          </div>

          {selectedPlace && (
            <div className="radar-map-selection">
              <button type="button" aria-label="선택 해제" onClick={() => setSelectedSlug(undefined)}>×</button>
              <div>
                <span>{selectedPlace.district} · {placeType(selectedPlace)}</span>
                <strong>{selectedPlace.name}</strong>
                <small>{formatPopulationRange(selectedPlace.crowd.minPopulation, selectedPlace.crowd.maxPopulation)} · {selectedPlace.crowd.message}</small>
              </div>
              <span className={`radar-badge radar-badge--${selectedPlace.crowd.level}`}>
                {CROWD_META[selectedPlace.crowd.level].shortLabel}
              </span>
              <Link href={`/place/${selectedPlace.slug}`}>상세보기 →</Link>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
