"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshIcon } from "@/components/icons";
import { CROWD_META } from "@/lib/crowd";
import type { CrowdLevel, PlacesPayload } from "@/types/place";

const levels: CrowdLevel[] = ["veryBusy", "busy", "normal", "relaxed"];

export function AppHeader() {
  const [payload, setPayload] = useState<PlacesPayload>();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/places", { cache: "no-store" });
        if (response.ok) setPayload((await response.json()) as PlacesPayload);
      } catch {
        // The dashboard retains its embedded mock data when the API is unavailable.
      }
    };
    void load();
    const dataTimer = window.setInterval(() => void load(), 60_000);
    const clockTimer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => {
      window.clearInterval(dataTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  const counts = useMemo(() => {
    return levels.reduce<Record<CrowdLevel, number>>(
      (acc, level) => {
        acc[level] = payload?.places.filter((place) => place.crowd.level === level).length ?? 0;
        return acc;
      },
      { relaxed: 0, normal: 0, busy: 0, veryBusy: 0 },
    );
  }, [payload]);

  const time = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(clock);

  return (
    <header className="radar-header">
      <div className="radar-header__primary">
        <div className="radar-brand">
          <strong>서울 인파레이더</strong>
          <span>실시간 인구밀집 상황판 · 서울 주요 장소</span>
        </div>

        <div className="radar-city-switch" role="group" aria-label="도시 선택">
          <button type="button" className="is-active">서울</button>
          <button type="button" disabled>제주</button>
          <button type="button" disabled>부산</button>
          <button type="button" disabled>강원</button>
          <button type="button" disabled>인천공항</button>
        </div>

        <div className="radar-header__counts" aria-label="혼잡도 현황">
          {levels.map((level) => (
            <span key={level}>
              <i className={`radar-dot radar-dot--${level}`} />
              {CROWD_META[level].shortLabel} <b>{counts[level]}</b>
            </span>
          ))}
        </div>

        <div className="radar-live-clock" title="1분마다 자동 갱신">
          <i />
          <b>{time}</b> 기준
          <span>· 1분마다 자동 갱신</span>
        </div>

        <div className="radar-header__actions">
          <button type="button" aria-label="새로고침" title="새로고침" onClick={() => window.location.reload()}>
            <RefreshIcon />
          </button>
          <a href="https://github.com/beerAndNacho/place-to-recommend-something" target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      </div>

      <div className="radar-header__mobile-row">
        <div className="radar-city-switch" role="group" aria-label="도시 선택">
          <button type="button" className="is-active">서울</button>
          <button type="button" disabled>제주</button>
          <button type="button" disabled>부산</button>
          <button type="button" disabled>강원</button>
          <button type="button" disabled>인천공항</button>
        </div>
        <div className="radar-live-clock"><i /><b>{time}</b> 기준</div>
      </div>
    </header>
  );
}
