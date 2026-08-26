"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { LngLatBoundsLike, Map as MapLibreMap, Marker, StyleSpecification } from "maplibre-gl";
import { CROWD_META, formatPopulationRange } from "@/lib/crowd";
import type { RankedPlace } from "@/types/place";

const SEOUL_CENTER: [number, number] = [126.978, 37.5665];

type MarkerEntry = {
  marker: Marker;
  element: HTMLButtonElement;
  place: RankedPlace;
};

type LabelBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const style: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

function intersects(first: LabelBox, second: LabelBox, gap = 4): boolean {
  return !(
    first.right + gap < second.left
    || first.left - gap > second.right
    || first.bottom + gap < second.top
    || first.top - gap > second.bottom
  );
}

function updateMarkerLabels(
  map: MapLibreMap,
  entries: MarkerEntry[],
  showLabels: boolean,
  selectedSlug?: string,
): void {
  const container = map.getContainer();
  const viewportWidth = container.clientWidth;
  const viewportHeight = container.clientHeight;
  const mobile = viewportWidth <= 760;
  const maxLabels = mobile ? 18 : viewportWidth < 900 ? 42 : 64;
  const accepted: LabelBox[] = [];
  let visibleCount = 0;

  const candidates = [...entries].sort((first, second) => {
    const firstSelected = first.place.slug === selectedSlug ? 1 : 0;
    const secondSelected = second.place.slug === selectedSlug ? 1 : 0;
    return secondSelected - firstSelected;
  });

  candidates.forEach(({ element, place }) => {
    const selected = place.slug === selectedSlug;
    element.classList.toggle("is-selected", selected);

    if (!showLabels && !selected) {
      element.classList.remove("has-label");
      return;
    }

    const point = map.project([place.longitude, place.latitude]);
    const characterCount = Array.from(place.name).length;
    const labelWidth = Math.min(
      mobile ? 124 : 154,
      Math.max(48, 22 + characterCount * (mobile ? 6 : 6.5)),
    );
    const box: LabelBox = {
      left: point.x + 10,
      right: point.x + 10 + labelWidth,
      top: point.y - 11,
      bottom: point.y + 11,
    };
    const outside = box.right < 0
      || box.left > viewportWidth
      || box.bottom < 0
      || box.top > viewportHeight;
    const collides = accepted.some((acceptedBox) => intersects(box, acceptedBox));
    const shouldShow = selected
      || (!outside && visibleCount < maxLabels && !collides);

    element.classList.toggle("has-label", shouldShow);
    if (shouldShow) {
      accepted.push(box);
      visibleCount += 1;
    }
  });
}

export function CrowdMap({
  places,
  selectedSlug,
  onSelect,
  showLabels = true,
  compact = false,
}: {
  places: RankedPlace[];
  selectedSlug?: string;
  onSelect?: (slug: string) => void;
  showLabels?: boolean;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const hasFitRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: SEOUL_CENTER,
      zoom: compact ? 12.4 : 11.15,
      minZoom: 9,
      maxZoom: 17,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [compact]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    const entries = places.map((place) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = [
        "radar-marker",
        `radar-marker--${place.crowd.level}`,
      ].join(" ");
      element.setAttribute(
        "aria-label",
        `${place.name}, ${CROWD_META[place.crowd.level].label}, ${formatPopulationRange(place.crowd.minPopulation, place.crowd.maxPopulation)}`,
      );

      const dot = document.createElement("span");
      dot.className = "radar-marker__dot";
      const label = document.createElement("span");
      label.className = "radar-marker__label";
      label.textContent = place.name;
      element.append(dot, label);
      element.addEventListener("click", () => onSelect?.(place.slug));

      const marker = new maplibregl.Marker({
        element,
        anchor: "left",
        offset: [-7, 0],
      })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);

      return { marker, element, place } satisfies MarkerEntry;
    });

    markersRef.current = entries;

    if (!hasFitRef.current && places.length > 1) {
      const longitudes = places.map((place) => place.longitude);
      const latitudes = places.map((place) => place.latitude);
      const bounds: LngLatBoundsLike = [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ];
      const mobile = map.getContainer().clientWidth <= 760;
      map.fitBounds(bounds, {
        padding: mobile ? 22 : compact ? 36 : 70,
        maxZoom: mobile ? 11.2 : compact ? 13 : 12.3,
        duration: 0,
      });
      hasFitRef.current = true;
    }

    const refreshLabels = () => updateMarkerLabels(map, entries, showLabels, selectedSlug);
    const frame = window.requestAnimationFrame(refreshLabels);
    map.once("idle", refreshLabels);
    map.on("moveend", refreshLabels);
    map.on("zoomend", refreshLabels);
    map.on("resize", refreshLabels);

    return () => {
      window.cancelAnimationFrame(frame);
      map.off("idle", refreshLabels);
      map.off("moveend", refreshLabels);
      map.off("zoomend", refreshLabels);
      map.off("resize", refreshLabels);
      entries.forEach(({ marker }) => marker.remove());
      if (markersRef.current === entries) markersRef.current = [];
    };
  }, [compact, onSelect, places, selectedSlug, showLabels]);

  useEffect(() => {
    const map = mapRef.current;
    const selected = places.find((place) => place.slug === selectedSlug);
    if (!map || !selected) return;
    map.easeTo({
      center: [selected.longitude, selected.latitude],
      zoom: Math.max(map.getZoom(), compact ? 13.4 : 13),
      duration: 550,
    });
  }, [compact, places, selectedSlug]);

  return <div ref={containerRef} className="crowd-map" aria-label="서울 장소 혼잡도 지도" />;
}
