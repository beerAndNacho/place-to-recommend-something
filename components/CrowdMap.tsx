"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { LngLatBoundsLike, Map as MapLibreMap, Marker, StyleSpecification } from "maplibre-gl";
import { CROWD_META, formatPopulationRange } from "@/lib/crowd";
import type { RankedPlace } from "@/types/place";

const SEOUL_CENTER: [number, number] = [126.978, 37.5665];

const style: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

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
  const markersRef = useRef<Marker[]>([]);
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
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [compact]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    places.forEach((place) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = [
        "radar-marker",
        `radar-marker--${place.crowd.level}`,
        selectedSlug === place.slug ? "is-selected" : "",
        showLabels || selectedSlug === place.slug ? "has-label" : "",
      ].filter(Boolean).join(" ");
      element.setAttribute(
        "aria-label",
        `${place.name}, ${CROWD_META[place.crowd.level].label}, ${formatPopulationRange(place.crowd.minPopulation, place.crowd.maxPopulation)}`,
      );
      element.innerHTML = `<span class="radar-marker__dot"></span><span class="radar-marker__label">${place.name}</span>`;
      element.addEventListener("click", () => onSelect?.(place.slug));

      const marker = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (!hasFitRef.current && places.length > 1) {
      const longitudes = places.map((place) => place.longitude);
      const latitudes = places.map((place) => place.latitude);
      const bounds: LngLatBoundsLike = [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ];
      map.fitBounds(bounds, {
        padding: compact ? 36 : 70,
        maxZoom: compact ? 13 : 12.3,
        duration: 0,
      });
      hasFitRef.current = true;
    }
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
